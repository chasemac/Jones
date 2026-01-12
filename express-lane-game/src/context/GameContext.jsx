import React, { createContext, useContext, useState, useEffect } from 'react';
import eventsData from '../data/events.json';
import stocksData from '../data/stocks.json';
import { playSound } from '../utils/sound';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const LOCATION_ORDER = [
  'leasing_office',
  'quick_eats',
  'public_library',
  'trendsetters',
  'coffee_shop',
  'blacks_market',
  'city_college',
  'tech_store',
  'neobank'
];

export const GameProvider = ({ children }) => {
  // Load initial state from localStorage if available
  const [player, setPlayer] = useState(() => {
      const saved = localStorage.getItem('jones_player');
      const defaults = {
        name: 'Player 1',
        money: 1000,
        happiness: 100,
        energy: 100,
        maxTime: 60,
        timeRemaining: 60,
        education: 'High School',
        job: null,
        housing: { title: "Shared Apartment", rent: 200 },
        currentLocation: 'leasing_office',
        savings: 0,
        debt: 0,
        productivity: 1.0,
        portfolio: {} // { "JNES": 10, "TECH": 5 }
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  // Market State (Prices)
  const [market, setMarket] = useState(() => {
      const saved = localStorage.getItem('jones_market');
      if (saved) return JSON.parse(saved);
      
      // Initialize with base prices
      const initialMarket = {};
      stocksData.forEach(stock => {
          initialMarket[stock.symbol] = stock.basePrice;
      });
      return initialMarket;
  });

  const [jones, setJones] = useState(() => {
      const saved = localStorage.getItem('jones_rival');
      return saved ? JSON.parse(saved) : {
        name: "The Joneses",
        money: 5000,
        happiness: 100,
        jobTitle: "Junior Associate",
        netWorth: 5000,
        currentLocation: 'trendsetters'
      };
  });

  const [week, setWeek] = useState(() => {
      const saved = localStorage.getItem('jones_week');
      return saved ? parseInt(saved) : 1;
  });

  const [inventory, setInventory] = useState(() => {
      const saved = localStorage.getItem('jones_inventory');
      return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState(() => {
      const saved = localStorage.getItem('jones_history');
      return saved ? JSON.parse(saved) : [];
  });

  const [gameStatus, setGameStatus] = useState('start'); // Always start at start screen, but data is loaded
  const [isTraveling, setIsTraveling] = useState(false);

  // Save state on changes
  useEffect(() => {
      localStorage.setItem('jones_player', JSON.stringify(player));
      localStorage.setItem('jones_rival', JSON.stringify(jones));
      localStorage.setItem('jones_week', week);
      localStorage.setItem('jones_inventory', JSON.stringify(inventory));
      localStorage.setItem('jones_history', JSON.stringify(history));
      localStorage.setItem('jones_market', JSON.stringify(market));
  }, [player, jones, week, inventory, history, market]);

  const resetGame = () => {
      localStorage.clear();
      window.location.reload();
  };

  const logEvent = (message) => {
    setHistory((prev) => [`Week ${week}: ${message}`, ...prev]);
  };

  const spendTime = (hours) => {
    if (player.timeRemaining >= hours) {
      setPlayer((prev) => ({
        ...prev,
        timeRemaining: prev.timeRemaining - hours,
      }));
      return true;
    }
    logEvent("Not enough time!");
    playSound('error');
    return false;
  };

  const updateMoney = (amount) => {
    if (amount > 0) playSound('coin');
    setPlayer((prev) => ({
      ...prev,
      money: prev.money + amount,
    }));
  };

  const bankTransaction = (type, amount) => {
    if (amount <= 0) return;
    
    setPlayer(prev => {
      let newMoney = prev.money;
      let newSavings = prev.savings;
      let newDebt = prev.debt;

      if (type === 'deposit') {
        if (prev.money >= amount) {
          newMoney -= amount;
          newSavings += amount;
          logEvent(`Deposited $${amount} into savings.`);
        } else {
          logEvent("Not enough cash to deposit.");
        }
      } else if (type === 'withdraw') {
        if (prev.savings >= amount) {
          newSavings -= amount;
          newMoney += amount;
          logEvent(`Withdrew $${amount} from savings.`);
        } else {
          logEvent("Not enough savings.");
        }
      } else if (type === 'repay') {
        if (prev.money >= amount) {
          const payAmount = Math.min(amount, prev.debt);
          newMoney -= payAmount;
          newDebt -= payAmount;
          logEvent(`Repaid $${payAmount} of debt.`);
        } else {
          logEvent("Not enough cash to repay debt.");
        }
      } else if (type === 'borrow') {
          newDebt += amount;
          newMoney += amount;
          logEvent(`Borrowed $${amount}.`);
      }

      return { ...prev, money: newMoney, savings: newSavings, debt: newDebt };
    });
  };

  const buyStock = (symbol, quantity) => {
    const price = market[symbol];
    const cost = price * quantity;
    
    if (player.money >= cost) {
        setPlayer(prev => {
            const currentQty = prev.portfolio?.[symbol] || 0;
            return {
                ...prev,
                money: prev.money - cost,
                portfolio: {
                    ...prev.portfolio,
                    [symbol]: currentQty + quantity
                }
            };
        });
        logEvent(`Bought ${quantity} shares of ${symbol} for $${cost}.`);
        playSound('coin');
    } else {
        logEvent("Not enough money to buy stock.");
        playSound('error');
    }
  };

  const sellStock = (symbol, quantity) => {
    const currentQty = player.portfolio?.[symbol] || 0;
    if (currentQty >= quantity) {
        const price = market[symbol];
        const earnings = price * quantity;
        
        setPlayer(prev => ({
            ...prev,
            money: prev.money + earnings,
            portfolio: {
                ...prev.portfolio,
                [symbol]: currentQty - quantity
            }
        }));
        logEvent(`Sold ${quantity} shares of ${symbol} for $${earnings}.`);
        playSound('coin');
    } else {
        logEvent("You don't have enough shares to sell.");
        playSound('error');
    }
  };

  const travelTo = async (id) => {
    if (isTraveling) return;

    // Wild Willy Check (Leaving Black's Market)
    if (player.currentLocation === 'blacks_market') {
        if (Math.random() < 0.3) { // 30% chance
            const stolen = Math.floor(player.money * 0.5); // Steals 50% of cash
            if (stolen > 0) {
                updateMoney(-stolen);
                logEvent(`👹 WILD WILLY ATTACK! He stole $${stolen}!`);
                playSound('error');
            } else {
                 logEvent(`👹 Wild Willy tried to rob you, but you're broke!`);
            }
        }
    }
    
    setIsTraveling(true);
    playSound('move');
    
    // Simulate travel time (1 hour per jump? or just fixed)
    if (spendTime(1)) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay per step
        
        setPlayer(prev => ({
            ...prev,
            currentLocation: id,
            timeRemaining: prev.timeRemaining - 1
        }));
    }
    
    setIsTraveling(false);
  };

  const endWeek = () => {
    setWeek((prev) => prev + 1);
    
    // Update The Joneses
    setJones(prev => {
        const income = 1000 + (week * 50); // They get richer every week
        const expenses = 500 + (week * 20); // Their lifestyle inflates
        const netChange = income - expenses;
        
        // Occasional "Big Win" for Joneses
        let bonus = 0;
        if (Math.random() < 0.3) {
            const jonesEvents = [
                "The Joneses bought a new boat. Must be nice.",
                "The Joneses are vacationing in Bali.",
                "The Joneses just renovated their kitchen.",
                "The Joneses bought a second home.",
                "The Joneses got a new purebred puppy.",
                "The Joneses are posting about their new Tesla."
            ];
            const randomEvent = jonesEvents[Math.floor(Math.random() * jonesEvents.length)];
            bonus = 2000;
            logEvent(`👀 ${randomEvent}`);
        }

        // Move Joneses to a random location
        const randomLoc = LOCATION_ORDER[Math.floor(Math.random() * LOCATION_ORDER.length)];

        return {
            ...prev,
            money: prev.money + netChange + bonus,
            netWorth: prev.netWorth + netChange + bonus,
            currentLocation: randomLoc
        };
    });

    // Update Market Prices
    setMarket(prevMarket => {
        const newMarket = { ...prevMarket };
        stocksData.forEach(stock => {
            const currentPrice = prevMarket[stock.symbol];
            const changePercent = (Math.random() * stock.volatility * 2) - stock.volatility; // e.g. -0.1 to +0.1
            let newPrice = Math.floor(currentPrice * (1 + changePercent));
            newPrice = Math.max(1, newPrice); // Minimum price $1
            newMarket[stock.symbol] = newPrice;
        });
        return newMarket;
    });

    // Random Event Logic
    let eventMessage = "";
    let moneyChange = 0;
    let timePenalty = 0;
    let savingsChange = 0;
    let happinessChange = 0;
    let jobLost = false;

    if (Math.random() < 0.4) { // 40% chance of event
        const event = eventsData[Math.floor(Math.random() * eventsData.length)];
        eventMessage = `EVENT: ${event.title} - ${event.description}`;
        
        switch (event.effect.type) {
            case 'money':
                moneyChange = event.effect.value;
                break;
            case 'time_loss':
                timePenalty = Math.floor(player.maxTime * event.effect.value);
                break;
            case 'rent_increase':
                moneyChange = -(player.housing.rent * event.effect.value);
                eventMessage += ` (Paid $${Math.abs(moneyChange)} extra)`;
                break;
            case 'savings_interest_bonus':
                savingsChange = Math.floor(player.savings * event.effect.value);
                break;
            case 'savings_loss':
                savingsChange = -Math.floor(player.savings * event.effect.value);
                break;
            case 'happiness':
                happinessChange = event.effect.value;
                break;
            case 'job_loss':
                if (player.job) {
                    jobLost = true;
                } else {
                    eventMessage = "EVENT: Corporate Restructuring - You would have been fired, but you're already unemployed.";
                }
                break;
            default:
                break;
        }
    }

    // Item Effects
    if (inventory.some(i => i.id === 'smart_watch')) {
        happinessChange += 5;
    }
    if (inventory.some(i => i.id === 'streaming_sub')) {
        happinessChange += 3;
        moneyChange -= 15;
    }

    setPlayer((prev) => {
      // Interest Calculations
      const savingsInterest = Math.floor(prev.savings * 0.01);
      const debtInterest = Math.floor(prev.debt * 0.05);
      
      if (savingsInterest > 0) logEvent(`Earned $${savingsInterest} interest on savings.`);
      if (debtInterest > 0) logEvent(`Charged $${debtInterest} interest on debt.`);

      // Debt Logic
      let finalMoney = prev.money - prev.housing.rent + moneyChange;
      let finalDebt = prev.debt + debtInterest;
      
      if (finalMoney < 0) {
          const shortfall = Math.abs(finalMoney);
          finalDebt += shortfall;
          finalMoney = 0;
          logEvent(`Couldn't pay rent! Added $${shortfall} to debt.`);
          playSound('error');
      } else {
          playSound('turn');
      }

      return {
        ...prev,
        timeRemaining: prev.maxTime - timePenalty,
        money: finalMoney,
        savings: prev.savings + savingsInterest + savingsChange,
        debt: finalDebt,
        happiness: Math.min(100, Math.max(0, prev.happiness + happinessChange)),
        job: jobLost ? null : prev.job
      };
    });

    
    logEvent(`Week ended. Rent paid ($${player.housing.rent}).`);
    if (eventMessage) logEvent(eventMessage);
  };

  const rentApartment = (housing) => {
    setPlayer(prev => ({ ...prev, housing }));
    logEvent(`Moved into ${housing.title}. Rent is now $${housing.rent}/week.`);
  };

  const applyForJob = (job) => {
    // Experience Check
    if (job.requirements?.experience && (!player.job || player.job.years < job.requirements.experience)) {
       const msg = `You need ${job.requirements.experience} years of experience.`;
       logEvent(`Rejected! ${msg}`);
       return { success: false, title: "Application Rejected", message: msg };
    }
    
    // Education Check
    if (job.requirements?.education && player.education !== job.requirements.education) {
        // Simple check: exact match. In a real game, we'd check hierarchy (e.g. Master's > Bachelor's)
        const msg = `You need a ${job.requirements.education}.`;
        logEvent(`Rejected! ${msg}`);
        return { success: false, title: "Application Rejected", message: msg };
    }

    // Item/Clothing Check
    if (job.requirements?.item) {
        const hasItem = inventory.some(i => i.id === job.requirements.item);
        if (!hasItem) {
            // Find item name for better error message
            const itemName = job.requirements.item.replace('_', ' ');
            const msg = `You need: ${itemName}.`;
            logEvent(`Rejected! ${msg}`);
            return { success: false, title: "Application Rejected", message: msg };
        }
    }

    setPlayer((prev) => ({ ...prev, job: { ...job, years: 0 } }));
    logEvent(`Hired! You are now a ${job.title}.`);
    playSound('success');
    return { success: true, title: "You're Hired!", message: `Congratulations! You are now a ${job.title}.` };
  };

  const workCurrentJob = () => {
    if (!player.job) return;
    const hours = 8;
    if (spendTime(hours)) {
      const earnings = player.job.wage * hours;
      updateMoney(earnings);
      logEvent(`Worked shift as ${player.job.title}. Earned $${earnings}.`);
      playSound('coin');
    }
  };

  const buyItem = (item) => {
    if (player.money >= item.cost) {
      
      if (item.type === 'food') {
        setPlayer(prev => ({
            ...prev,
            money: prev.money - item.cost,
            happiness: Math.min(100, prev.happiness + 5)
        }));
        logEvent(`Ate ${item.name}. Yum!`);
        playSound('coin');
        return true;
      }

      updateMoney(-item.cost);
      setInventory((prev) => [...prev, item]);
      logEvent(`Bought ${item.name} for $${item.cost}.`);
      playSound('coin');
      return true;
    }
    logEvent(`Not enough money for ${item.name}!`);
    playSound('error');
    return false;
  };

  const sellItem = (item) => {
    const sellPrice = Math.floor(item.cost * 0.5);
    updateMoney(sellPrice);
    setInventory(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        if (index > -1) {
            const newInv = [...prev];
            newInv.splice(index, 1);
            return newInv;
        }
        return prev;
    });
    logEvent(`Sold ${item.name} for $${sellPrice}.`);
    playSound('coin');
  };

  const enroll = (course) => {
    // Check requirements
    if (course.requirements?.item) {
        const hasItem = inventory.some(i => i.id === course.requirements.item);
        if (!hasItem) {
            logEvent(`You need a ${course.requirements.item} to enroll!`);
            playSound('error');
            return;
        }
    }

    if (player.money >= course.cost) {
      updateMoney(-course.cost);
      setPlayer(prev => ({
        ...prev,
        currentCourse: { ...course, progress: 0 }
      }));
      logEvent(`Enrolled in ${course.title}. Time to study!`);
      playSound('success');
    } else {
      logEvent("Not enough money for tuition!");
      playSound('error');
    }
  };

  const study = () => {
    if (!player.currentCourse) return;
    const hours = 10;
    if (spendTime(hours)) {
      setPlayer(prev => {
        const newProgress = prev.currentCourse.progress + hours;
        if (newProgress >= prev.currentCourse.totalHours) {
          logEvent(`Congratulations! You earned a ${prev.currentCourse.degree}.`);
          playSound('success');
          return {
            ...prev,
            education: prev.currentCourse.degree,
            currentCourse: null
          };
        }
        logEvent(`Studied for 10 hours. Progress: ${newProgress}/${prev.currentCourse.totalHours}`);
        return {
          ...prev,
          currentCourse: { ...prev.currentCourse, progress: newProgress }
        };
      });
    }
  };

  useEffect(() => {
    const netWorth = player.money + player.savings - player.debt;
    // Win Condition: $10,000 Net Worth + 80 Happiness (Standard Goal)
    if (gameStatus === 'playing') {
        if (netWorth >= 10000 && player.happiness >= 80) {
            setTimeout(() => { setGameStatus('won'); playSound('success'); }, 0);
        } else if (player.happiness <= 0) {
            setTimeout(() => { setGameStatus('lost'); playSound('error'); }, 0);
        }
    }
  }, [player, gameStatus]);

  const startGame = () => {
      setGameStatus('playing');
      playSound('click');
  };

  const value = {
    player,
    setPlayer,
    jones,
    week,
    gameStatus,
    startGame,
    isTraveling,
    inventory,
    setInventory,
    history,
    spendTime,
    updateMoney,
    endWeek,
    logEvent,
    applyForJob,
    workCurrentJob,
    buyItem,
    sellItem,
    enroll,
    study,
    rentApartment,
    travelTo,
    bankTransaction,
    market,
    buyStock,
    sellStock,
    resetGame
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
