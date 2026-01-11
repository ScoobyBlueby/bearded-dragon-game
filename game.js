// Bearded Dragon Pet Simulator - Game Logic

class BeardedDragonGame {
    constructor() {
        this.dragon = null;
        this.gameLoop = null;
        this.lastUpdate = Date.now();
        this.dayNightCycle = 0; // 0-100, 0-50 is day, 50-100 is night
        this.tankCleanliness = 100;
        this.lastFed = Date.now();
        this.lastHandled = 0;
        this.uvbHoursToday = 0;
        this.dayStartTime = Date.now();

        // Movement and behavior system
        this.positions = {
            basking: { x: 75, y: 110, name: 'basking rock' },
            coolSide: { x: 15, y: 100, name: 'cool side' },
            hide: { x: 8, y: 95, name: 'hide cave' },
            food: { x: 55, y: 100, name: 'food dish' },
            water: { x: 25, y: 100, name: 'water dish' },
            center: { x: 45, y: 105, name: 'center' }
        };
        this.currentPosition = 'basking';
        this.targetPosition = null;
        this.isMoving = false;
        this.lastBehaviorCheck = Date.now();
        this.lastIdleAnimation = Date.now();
        this.idleAnimationInterval = null;

        this.initializeEventListeners();
    }

    // Dragon stats and growth stages
    createDragon(name, color) {
        this.dragon = {
            name: name || 'Spike',
            color: color || 'normal',
            age: 0, // in game days
            realAge: 0, // in real seconds for tracking
            size: 4, // inches

            // Stats (0-100)
            health: 100,
            hunger: 80,
            hydration: 100,
            happiness: 100,

            // Growth stages: baby (0-60 days), juvenile (60-180), subadult (180-365), adult (365+)
            stage: 'baby',

            // Behavior
            isAsleep: false,
            isBaskig: false,
            mood: 'happy',

            // Diet tracking
            insectsToday: 0,
            veggiestoday: 0,
            lastMeal: Date.now(),

            // Environment preferences
            preferredTemp: 100,

            // Stats tracking
            totalDaysAlive: 0,
            totalMealsEaten: 0,
            timesHandled: 0
        };

        return this.dragon;
    }

    // Growth stage calculation
    getGrowthStage(age) {
        if (age < 60) return 'baby';
        if (age < 180) return 'juvenile';
        if (age < 365) return 'subadult';
        return 'adult';
    }

    getGrowthStageEmoji(stage) {
        const emojis = {
            'baby': '🥒 Baby',
            'juvenile': '🌱 Juvenile',
            'subadult': '🌿 Sub-Adult',
            'adult': '🌳 Adult'
        };
        return emojis[stage] || '🦎';
    }

    // Calculate size based on age
    calculateSize(age) {
        if (age < 30) return 4 + (age / 30) * 4; // 4-8 inches
        if (age < 60) return 8 + ((age - 30) / 30) * 4; // 8-12 inches
        if (age < 180) return 12 + ((age - 60) / 120) * 6; // 12-18 inches
        if (age < 365) return 18 + ((age - 180) / 185) * 4; // 18-22 inches
        return Math.min(24, 22 + ((age - 365) / 365) * 2); // Max 24 inches
    }

    // Environment system
    getEnvironment() {
        return {
            baskingTemp: parseInt(document.getElementById('basking-temp').value),
            coolTemp: parseInt(document.getElementById('cool-temp').value),
            humidity: parseInt(document.getElementById('humidity').value),
            uvbOn: document.getElementById('uvb-toggle').classList.contains('active')
        };
    }

    // Check if environment is optimal
    checkEnvironment() {
        const env = this.getEnvironment();
        let issues = [];
        let score = 100;

        // Basking temp (optimal 95-110°F)
        if (env.baskingTemp < 95) {
            issues.push('Basking spot too cold!');
            score -= 20;
        } else if (env.baskingTemp > 110) {
            issues.push('Basking spot too hot!');
            score -= 25;
        }

        // Cool side temp (optimal 75-85°F)
        if (env.coolTemp < 75) {
            issues.push('Cool side too cold!');
            score -= 15;
        } else if (env.coolTemp > 85) {
            issues.push('Cool side too warm!');
            score -= 15;
        }

        // Humidity (optimal 30-40%)
        if (env.humidity < 30) {
            issues.push('Humidity too low!');
            score -= 10;
        } else if (env.humidity > 40) {
            issues.push('Humidity too high! Risk of respiratory infection.');
            score -= 20;
        }

        // UVB
        if (!env.uvbOn) {
            issues.push('UVB light is off! Dragon needs UV for vitamin D.');
            score -= 30;
        }

        // Tank cleanliness
        if (this.tankCleanliness < 50) {
            issues.push('Tank needs cleaning!');
            score -= 15;
        }

        return { score: Math.max(0, score), issues, env };
    }

    // Feeding system
    feedDragon(food, type) {
        if (!this.dragon) return;

        const foods = {
            // Insects
            'crickets': { hunger: 15, health: 5, happiness: 5, type: 'insect' },
            'dubia': { hunger: 20, health: 8, happiness: 8, type: 'insect' },
            'mealworms': { hunger: 10, health: 3, happiness: 3, type: 'insect' },
            'hornworms': { hunger: 25, health: 5, happiness: 15, type: 'insect' },
            // Veggies
            'collards': { hunger: 10, health: 10, happiness: 2, type: 'veggie' },
            'squash': { hunger: 12, health: 8, happiness: 3, type: 'veggie' },
            'bell-pepper': { hunger: 8, health: 5, happiness: 2, type: 'veggie' }
        };

        const foodData = foods[food];
        if (!foodData) return;

        // Baby dragons need more insects, adults need more veggies
        let effectiveness = 1;
        if (this.dragon.stage === 'baby' || this.dragon.stage === 'juvenile') {
            effectiveness = type === 'insect' ? 1.2 : 0.8;
        } else {
            effectiveness = type === 'veggie' ? 1.2 : 0.9;
        }

        // Apply food effects
        this.dragon.hunger = Math.min(100, this.dragon.hunger + foodData.hunger * effectiveness);
        this.dragon.health = Math.min(100, this.dragon.health + foodData.health * effectiveness);
        this.dragon.happiness = Math.min(100, this.dragon.happiness + foodData.happiness);
        this.dragon.lastMeal = Date.now();
        this.dragon.totalMealsEaten++;

        // Track diet balance
        if (type === 'insect') {
            this.dragon.insectsToday++;
        } else {
            this.dragon.veggiestoday++;
        }

        // Move to food dish and animate eating
        this.moveDragonTo('food', () => {
            this.animateDragonEating();
        });

        // Show food in dish briefly
        const foodDish = document.getElementById('food-dish');
        foodDish.style.background = 'linear-gradient(180deg, #8B4513 0%, #654321 50%, #90EE90 100%)';
        setTimeout(() => {
            foodDish.style.background = 'linear-gradient(180deg, #8B4513 0%, #654321 100%)';
        }, 1000);

        const foodNames = {
            'crickets': '🦗 Crickets',
            'dubia': '🪳 Dubia Roaches',
            'mealworms': '🐛 Mealworms',
            'hornworms': '🐛 Hornworms',
            'collards': '🥬 Collard Greens',
            'squash': '🎃 Butternut Squash',
            'bell-pepper': '🫑 Bell Pepper'
        };

        this.addMessage(`${this.dragon.name} ate ${foodNames[food]}!`, 'success');
        this.updateUI();
    }

    giveWater() {
        if (!this.dragon) return;

        // Move to water dish
        this.moveDragonTo('water', () => {
            this.dragon.hydration = Math.min(100, this.dragon.hydration + 30);
            this.dragon.happiness = Math.min(100, this.dragon.happiness + 5);

            // Drinking animation (head bobs)
            this.doHeadBob();

            this.addMessage(`${this.dragon.name} drank some water! 💧`, 'info');
            this.updateUI();
        });
    }

    // Actions
    handleDragon() {
        if (!this.dragon) return;

        const now = Date.now();
        const timeSinceLastHandle = now - this.lastHandled;

        // Don't handle too frequently (wait at least 30 seconds game time)
        if (timeSinceLastHandle < 30000) {
            this.addMessage(`${this.dragon.name} needs a break from handling.`, 'warning');
            return;
        }

        // Baby dragons stress easier
        let happinessGain = 10;
        let stressChance = 0.1;

        if (this.dragon.stage === 'baby') {
            happinessGain = 5;
            stressChance = 0.3;
        }

        if (Math.random() < stressChance) {
            this.dragon.happiness = Math.max(0, this.dragon.happiness - 10);
            this.puffBeard();
            this.addMessage(`${this.dragon.name} got a bit stressed from handling.`, 'warning');
            // Stressed dragon runs to hide
            setTimeout(() => this.moveDragonTo('hide'), 500);
        } else {
            this.dragon.happiness = Math.min(100, this.dragon.happiness + happinessGain);
            this.addMessage(`${this.dragon.name} enjoyed being handled! 🤲`, 'success');
            // Happy dragon does arm wave
            this.doArmWave();
        }

        this.dragon.timesHandled++;
        this.lastHandled = now;
        this.updateUI();
    }

    giveBath() {
        if (!this.dragon) return;

        this.dragon.hydration = Math.min(100, this.dragon.hydration + 40);
        this.dragon.happiness = Math.min(100, this.dragon.happiness + 10);
        this.dragon.health = Math.min(100, this.dragon.health + 5);

        this.addMessage(`${this.dragon.name} enjoyed a warm bath! 🛁`, 'success');
        this.showNotification('Bath time! Your dragon is clean and hydrated.', 'success');
        this.updateUI();
    }

    cleanTank() {
        this.tankCleanliness = 100;
        this.dragon.health = Math.min(100, this.dragon.health + 5);
        this.dragon.happiness = Math.min(100, this.dragon.happiness + 5);

        this.addMessage('Tank cleaned! Environment is now spotless. 🧹', 'success');
        this.updateUI();
    }

    playWithDragon() {
        if (!this.dragon || this.isMoving) return;

        // Make dragon explore - move to random positions
        const positions = ['center', 'coolSide', 'basking', 'center'];
        let moveIndex = 0;

        const doNextMove = () => {
            if (moveIndex < positions.length) {
                this.moveDragonTo(positions[moveIndex], () => {
                    moveIndex++;
                    if (moveIndex < positions.length) {
                        setTimeout(doNextMove, 500);
                    } else {
                        // Finished playing
                        this.dragon.happiness = Math.min(100, this.dragon.happiness + 15);
                        this.dragon.hunger = Math.max(0, this.dragon.hunger - 5);
                        this.addMessage(`${this.dragon.name} had fun playing! 🎾`, 'success');
                        this.updateUI();
                    }
                });
            }
        };

        doNextMove();
    }

    // Dragon animations
    animateDragonEating() {
        const dragonEl = document.getElementById('dragon');
        dragonEl.style.transition = 'transform 0.2s ease';

        let bobs = 0;
        const bobInterval = setInterval(() => {
            dragonEl.style.transform = bobs % 2 === 0 ? 'translateY(-5px)' : 'translateY(0)';
            bobs++;
            if (bobs >= 6) {
                clearInterval(bobInterval);
                this.updateDragonAppearance();
            }
        }, 200);
    }

    puffBeard() {
        const beard = document.getElementById('dragon-beard');
        beard.classList.add('puffed');
        setTimeout(() => {
            beard.classList.remove('puffed');
        }, 3000);
    }

    // Movement system - move dragon to a position in the terrarium
    moveDragonTo(positionKey, callback) {
        if (!this.dragon || this.isMoving || this.dragon.isAsleep) return;

        const targetPos = this.positions[positionKey];
        if (!targetPos || positionKey === this.currentPosition) {
            if (callback) callback();
            return;
        }

        this.isMoving = true;
        this.targetPosition = positionKey;

        const dragonEl = document.getElementById('dragon');
        const currentPos = this.positions[this.currentPosition];

        // Determine direction and flip dragon if needed
        const movingLeft = targetPos.x < currentPos.x;
        dragonEl.classList.toggle('facing-left', movingLeft);

        // Start walking animation
        dragonEl.classList.add('walking');

        // Calculate movement duration based on distance
        const distance = Math.abs(targetPos.x - currentPos.x);
        const duration = Math.max(800, distance * 30); // Min 800ms, scale with distance

        // Apply movement
        dragonEl.style.transition = `right ${duration}ms ease-in-out, bottom ${duration}ms ease-in-out`;
        dragonEl.style.right = `${100 - targetPos.x}%`;
        dragonEl.style.bottom = `${targetPos.y}px`;

        setTimeout(() => {
            dragonEl.classList.remove('walking');
            dragonEl.classList.remove('facing-left');
            this.currentPosition = positionKey;
            this.isMoving = false;
            this.targetPosition = null;

            if (callback) callback();
        }, duration);
    }

    // Autonomous behavior - dragon decides where to go based on needs
    updateBehavior() {
        if (!this.dragon || this.isMoving || this.dragon.isAsleep) return;

        const now = Date.now();
        if (now - this.lastBehaviorCheck < 3000) return; // Check every 3 seconds
        this.lastBehaviorCheck = now;

        const env = this.getEnvironment();
        let decision = null;
        let priority = 0;

        // Priority 1: Critical needs
        if (this.dragon.hunger < 20 && this.currentPosition !== 'food') {
            decision = 'food';
            priority = 10;
        }

        if (this.dragon.hydration < 25 && this.currentPosition !== 'water') {
            if (priority < 9) {
                decision = 'water';
                priority = 9;
            }
        }

        // Priority 2: Temperature regulation
        if (priority < 8) {
            const avgTemp = (env.baskingTemp + env.coolTemp) / 2;

            // Too cold - seek basking spot
            if (env.baskingTemp < 95 || avgTemp < 80) {
                if (this.currentPosition !== 'basking') {
                    decision = 'basking';
                    priority = 8;
                }
            }
            // Too hot - seek cool side
            else if (env.baskingTemp > 110 && this.currentPosition === 'basking') {
                decision = 'coolSide';
                priority = 8;
            }
        }

        // Priority 3: Stress/happiness - hide when unhappy
        if (priority < 7 && this.dragon.happiness < 30 && this.currentPosition !== 'hide') {
            decision = 'hide';
            priority = 7;
        }

        // Priority 4: Normal thermoregulation cycle
        if (priority < 5 && Math.random() < 0.15) {
            // Bearded dragons shuttle between warm and cool areas
            if (this.currentPosition === 'basking' && Math.random() < 0.3) {
                decision = 'coolSide';
                priority = 5;
            } else if (this.currentPosition === 'coolSide' && Math.random() < 0.4) {
                decision = 'basking';
                priority = 5;
            }
        }

        // Priority 5: Random exploration
        if (priority < 3 && Math.random() < 0.08) {
            const positions = Object.keys(this.positions);
            const randomPos = positions[Math.floor(Math.random() * positions.length)];
            if (randomPos !== this.currentPosition) {
                decision = randomPos;
                priority = 3;
            }
        }

        // Execute decision
        if (decision) {
            this.moveDragonTo(decision, () => {
                // Occasionally log significant movements
                if (priority >= 7) {
                    const posName = this.positions[decision].name;
                    this.addMessage(`${this.dragon.name} moved to the ${posName}.`, 'info');
                }
            });
        }
    }

    // Idle animations - small movements when stationary
    performIdleAnimation() {
        if (!this.dragon || this.isMoving || this.dragon.isAsleep) return;

        const dragonEl = document.getElementById('dragon');
        const random = Math.random();

        if (random < 0.25) {
            // Head bob
            this.doHeadBob();
        } else if (random < 0.4) {
            // Arm wave (submission/recognition gesture)
            this.doArmWave();
        } else if (random < 0.6) {
            // Look around
            this.doLookAround();
        } else if (random < 0.75) {
            // Tail flick
            this.doTailFlick();
        } else if (random < 0.85) {
            // Tongue flick (testing air)
            this.doTongueFlick();
        }
        // Otherwise, stay still
    }

    doHeadBob() {
        const dragonEl = document.getElementById('dragon');
        dragonEl.classList.add('head-bobbing');

        // More bobs when assertive/happy
        const bobCount = this.dragon.happiness > 70 ? 4 : 2;

        setTimeout(() => {
            dragonEl.classList.remove('head-bobbing');
        }, bobCount * 300);
    }

    doArmWave() {
        const dragonEl = document.getElementById('dragon');
        dragonEl.classList.add('arm-waving');

        setTimeout(() => {
            dragonEl.classList.remove('arm-waving');
        }, 1500);
    }

    doLookAround() {
        const head = document.querySelector('.dragon-head');
        if (!head) return;

        head.classList.add('looking-around');

        setTimeout(() => {
            head.classList.remove('looking-around');
        }, 2000);
    }

    doTailFlick() {
        const tail = document.querySelector('.dragon-tail');
        if (!tail) return;

        tail.classList.add('flicking');

        setTimeout(() => {
            tail.classList.remove('flicking');
        }, 800);
    }

    doTongueFlick() {
        const dragonEl = document.getElementById('dragon');
        dragonEl.classList.add('tongue-flicking');

        setTimeout(() => {
            dragonEl.classList.remove('tongue-flicking');
        }, 400);
    }

    startIdleAnimations() {
        if (this.idleAnimationInterval) return;

        this.idleAnimationInterval = setInterval(() => {
            if (this.dragon && !this.dragon.isAsleep && Math.random() < 0.4) {
                this.performIdleAnimation();
            }
        }, 4000);
    }

    stopIdleAnimations() {
        if (this.idleAnimationInterval) {
            clearInterval(this.idleAnimationInterval);
            this.idleAnimationInterval = null;
        }
    }

    // Update dragon appearance based on state
    updateDragonAppearance() {
        if (!this.dragon) return;

        const dragonEl = document.getElementById('dragon');

        // Update color morph
        dragonEl.className = 'dragon ' + this.dragon.color;

        // Update size class based on growth stage
        dragonEl.classList.add(this.dragon.stage);

        // Sleep state
        if (this.dragon.isAsleep) {
            dragonEl.classList.add('sleeping');
        } else {
            dragonEl.classList.remove('sleeping');
        }

        // Stress indication (puffed beard)
        if (this.dragon.happiness < 30) {
            this.puffBeard();
        }
    }

    // Game tick - runs every second
    gameTick() {
        if (!this.dragon) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // seconds
        this.lastUpdate = now;

        // Age progression (1 game day = 2 real minutes for faster gameplay)
        this.dragon.realAge += deltaTime;
        const newAge = Math.floor(this.dragon.realAge / 120); // 120 seconds = 1 game day

        if (newAge > this.dragon.age) {
            this.dragon.age = newAge;
            this.dragon.totalDaysAlive = newAge;

            // Check for stage transitions
            const newStage = this.getGrowthStage(newAge);
            if (newStage !== this.dragon.stage) {
                this.dragon.stage = newStage;
                this.showNotification(`${this.dragon.name} has grown into a ${newStage}!`, 'success');
                this.addMessage(`🎉 ${this.dragon.name} is now a ${this.getGrowthStageEmoji(newStage)}!`, 'success');
            }

            // Update size
            this.dragon.size = this.calculateSize(newAge);

            // Daily reset
            this.dragon.insectsToday = 0;
            this.dragon.veggiestoday = 0;
        }

        // Day/night cycle (affects sleep)
        this.dayNightCycle = (this.dayNightCycle + deltaTime * 0.5) % 100;
        const isNight = this.dayNightCycle > 50;

        // UVB tracking
        const env = this.getEnvironment();
        if (env.uvbOn && !isNight) {
            this.uvbHoursToday += deltaTime / 3600;
        }

        // Reset UVB hours at "midnight"
        if (this.dayNightCycle < 1 && this.dayNightCycle > 0) {
            this.uvbHoursToday = 0;
        }

        // Stat decay
        const decayRate = deltaTime * 0.1; // Base decay per second

        // Hunger decays faster for babies
        const hungerDecay = this.dragon.stage === 'baby' ? decayRate * 2 : decayRate;
        this.dragon.hunger = Math.max(0, this.dragon.hunger - hungerDecay);

        // Hydration decay
        this.dragon.hydration = Math.max(0, this.dragon.hydration - decayRate * 0.5);

        // Happiness decay (faster if environment is bad)
        const envCheck = this.checkEnvironment();
        const happinessDecay = decayRate * (envCheck.score < 50 ? 2 : 0.5);
        this.dragon.happiness = Math.max(0, this.dragon.happiness - happinessDecay);

        // Health effects
        let healthChange = 0;

        // Environment affects health
        if (envCheck.score < 50) {
            healthChange -= decayRate * 0.5;
        } else if (envCheck.score > 80) {
            healthChange += decayRate * 0.1;
        }

        // Hunger affects health
        if (this.dragon.hunger < 20) {
            healthChange -= decayRate * 0.3;
        }

        // Hydration affects health
        if (this.dragon.hydration < 20) {
            healthChange -= decayRate * 0.3;
        }

        // Tank cleanliness decay
        this.tankCleanliness = Math.max(0, this.tankCleanliness - decayRate * 0.05);
        if (this.tankCleanliness < 30) {
            healthChange -= decayRate * 0.2;
        }

        this.dragon.health = Math.max(0, Math.min(100, this.dragon.health + healthChange));

        // Update mood
        this.updateMood();

        // Sleep behavior
        if (isNight && !this.dragon.isAsleep && this.dragon.happiness > 30) {
            this.dragon.isAsleep = true;
            this.addMessage(`${this.dragon.name} fell asleep. 💤`, 'info');
        } else if (!isNight && this.dragon.isAsleep) {
            this.dragon.isAsleep = false;
            this.addMessage(`${this.dragon.name} woke up! ☀️`, 'info');
        }

        // Warnings
        if (this.dragon.hunger < 15 && Math.random() < 0.01) {
            this.addMessage(`${this.dragon.name} is very hungry!`, 'danger');
            this.showNotification('Your dragon is starving!', 'danger');
        }

        if (this.dragon.hydration < 15 && Math.random() < 0.01) {
            this.addMessage(`${this.dragon.name} is dehydrated!`, 'danger');
        }

        if (this.dragon.health < 30 && Math.random() < 0.01) {
            this.addMessage(`${this.dragon.name} needs medical attention!`, 'danger');
            this.showNotification('Your dragon\'s health is critical!', 'danger');
        }

        // Environment warnings
        if (envCheck.issues.length > 0 && Math.random() < 0.005) {
            this.addMessage(envCheck.issues[0], 'warning');
        }

        // Game over check
        if (this.dragon.health <= 0) {
            this.gameOver();
            return;
        }

        // Autonomous behavior - dragon moves around based on needs
        this.updateBehavior();

        // Update UI
        this.updateUI();

        // Auto-save every 30 seconds
        if (Math.floor(this.dragon.realAge) % 30 === 0) {
            this.saveGame();
        }
    }

    updateMood() {
        if (!this.dragon) return;

        const avgStats = (this.dragon.health + this.dragon.hunger + this.dragon.hydration + this.dragon.happiness) / 4;

        let mood, emoji;

        if (this.dragon.isAsleep) {
            mood = 'sleeping';
            emoji = '😴';
        } else if (avgStats > 80) {
            mood = 'happy';
            emoji = '😊';
        } else if (avgStats > 60) {
            mood = 'content';
            emoji = '🙂';
        } else if (avgStats > 40) {
            mood = 'okay';
            emoji = '😐';
        } else if (avgStats > 20) {
            mood = 'unhappy';
            emoji = '😟';
        } else {
            mood = 'distressed';
            emoji = '😫';
        }

        this.dragon.mood = mood;
        document.getElementById('dragon-mood').textContent = `${emoji} ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
    }

    // UI Updates
    updateUI() {
        if (!this.dragon) return;

        // Update name and age
        document.getElementById('dragon-name').textContent = this.dragon.name;
        document.getElementById('dragon-age').textContent = `Age: ${this.dragon.age} days`;

        // Update stat bars
        this.updateBar('health', this.dragon.health);
        this.updateBar('hunger', this.dragon.hunger);
        this.updateBar('hydration', this.dragon.hydration);
        this.updateBar('happiness', this.dragon.happiness);

        // Update growth info
        document.getElementById('growth-stage').textContent = this.getGrowthStageEmoji(this.dragon.stage);
        document.getElementById('size-display').textContent = `${this.dragon.size.toFixed(1)} inches`;

        // Update environment displays
        const env = this.getEnvironment();
        document.getElementById('basking-temp-value').textContent = `${env.baskingTemp}°F`;
        document.getElementById('cool-temp-value').textContent = `${env.coolTemp}°F`;
        document.getElementById('humidity-value').textContent = `${env.humidity}%`;

        // Update thermometer
        const avgTemp = (env.baskingTemp + env.coolTemp) / 2;
        const thermoHeight = Math.min(100, Math.max(0, (avgTemp - 60) / 60 * 100));
        document.getElementById('thermo-fill').style.height = `${thermoHeight}%`;
        document.getElementById('temp-display').textContent = `${Math.round(avgTemp)}°F`;

        // Update lights
        document.getElementById('uvb-light').classList.toggle('off', !env.uvbOn);
        document.getElementById('heat-lamp').classList.toggle('off', env.baskingTemp < 80);

        // Update dragon appearance
        this.updateDragonAppearance();
    }

    updateBar(stat, value) {
        const bar = document.getElementById(`${stat}-bar`);
        const valueEl = document.getElementById(`${stat}-value`);

        bar.style.width = `${value}%`;
        valueEl.textContent = `${Math.round(value)}%`;

        // Color coding
        if (value < 25) {
            bar.style.filter = 'hue-rotate(-30deg) saturate(1.5)';
        } else if (value < 50) {
            bar.style.filter = 'hue-rotate(-15deg)';
        } else {
            bar.style.filter = 'none';
        }
    }

    // Message system
    addMessage(text, type = 'info') {
        const messagesEl = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageEl.innerHTML = `
            ${text}
            <div class="message-time">${time}</div>
        `;

        messagesEl.insertBefore(messageEl, messagesEl.firstChild);

        // Keep only last 20 messages
        while (messagesEl.children.length > 20) {
            messagesEl.removeChild(messagesEl.lastChild);
        }
    }

    showNotification(text, type = 'info') {
        const notifEl = document.getElementById('notification');
        notifEl.textContent = text;
        notifEl.className = `notification ${type} show`;

        setTimeout(() => {
            notifEl.classList.remove('show');
        }, 3000);
    }

    // Game state
    startGame(name, color) {
        this.createDragon(name, color);
        document.getElementById('start-screen').classList.add('hidden');

        this.addMessage(`Welcome ${this.dragon.name}! Your bearded dragon adventure begins!`, 'success');
        this.showNotification(`${this.dragon.name} has hatched!`, 'success');

        // Initialize dragon position
        this.currentPosition = 'basking';
        const startPos = this.positions.basking;
        const dragonEl = document.getElementById('dragon');
        dragonEl.style.right = `${100 - startPos.x}%`;
        dragonEl.style.bottom = `${startPos.y}px`;

        this.updateUI();
        this.startGameLoop();
        this.startIdleAnimations();
        this.saveGame();
    }

    startGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        this.lastUpdate = Date.now();
        this.gameLoop = setInterval(() => this.gameTick(), 1000);
    }

    gameOver() {
        clearInterval(this.gameLoop);
        this.stopIdleAnimations();
        this.showNotification(`${this.dragon.name} has passed away... 😢`, 'danger');
        this.addMessage(`${this.dragon.name} lived for ${this.dragon.age} days.`, 'danger');

        // Clear save
        localStorage.removeItem('beardedDragonSave');

        setTimeout(() => {
            if (confirm(`${this.dragon.name} has passed away after ${this.dragon.age} days.\n\nWould you like to start a new game?`)) {
                location.reload();
            }
        }, 2000);
    }

    // Save/Load system
    saveGame() {
        if (!this.dragon) return;

        const saveData = {
            dragon: this.dragon,
            tankCleanliness: this.tankCleanliness,
            dayNightCycle: this.dayNightCycle,
            uvbHoursToday: this.uvbHoursToday,
            environment: this.getEnvironment(),
            savedAt: Date.now()
        };

        localStorage.setItem('beardedDragonSave', JSON.stringify(saveData));
    }

    loadGame() {
        const saveStr = localStorage.getItem('beardedDragonSave');
        if (!saveStr) return false;

        try {
            const saveData = JSON.parse(saveStr);

            // Calculate time passed since save
            const timePassed = (Date.now() - saveData.savedAt) / 1000;

            this.dragon = saveData.dragon;
            this.tankCleanliness = saveData.tankCleanliness;
            this.dayNightCycle = saveData.dayNightCycle;
            this.uvbHoursToday = saveData.uvbHoursToday;

            // Apply some stat decay for time passed (but cap it)
            const maxDecay = Math.min(timePassed * 0.01, 20);
            this.dragon.hunger = Math.max(0, this.dragon.hunger - maxDecay);
            this.dragon.hydration = Math.max(0, this.dragon.hydration - maxDecay * 0.5);
            this.dragon.happiness = Math.max(0, this.dragon.happiness - maxDecay * 0.3);

            // Restore environment settings
            if (saveData.environment) {
                document.getElementById('basking-temp').value = saveData.environment.baskingTemp;
                document.getElementById('cool-temp').value = saveData.environment.coolTemp;
                document.getElementById('humidity').value = saveData.environment.humidity;

                const uvbBtn = document.getElementById('uvb-toggle');
                if (saveData.environment.uvbOn) {
                    uvbBtn.classList.add('active');
                    uvbBtn.textContent = 'ON';
                } else {
                    uvbBtn.classList.remove('active');
                    uvbBtn.textContent = 'OFF';
                }
            }

            document.getElementById('start-screen').classList.add('hidden');
            this.addMessage(`Welcome back! ${this.dragon.name} missed you!`, 'success');

            if (timePassed > 60) {
                this.addMessage(`You were away for ${Math.round(timePassed / 60)} minutes.`, 'info');
            }

            // Initialize dragon position
            this.currentPosition = 'basking';
            const startPos = this.positions.basking;
            const dragonEl = document.getElementById('dragon');
            dragonEl.style.right = `${100 - startPos.x}%`;
            dragonEl.style.bottom = `${startPos.y}px`;

            this.updateUI();
            this.startGameLoop();
            this.startIdleAnimations();

            return true;
        } catch (e) {
            console.error('Failed to load save:', e);
            return false;
        }
    }

    // Event listeners
    initializeEventListeners() {
        // Start game
        document.getElementById('start-btn').addEventListener('click', () => {
            const name = document.getElementById('name-input').value.trim() || 'Spike';
            const colorBtn = document.querySelector('.color-btn.selected');
            const color = colorBtn ? colorBtn.dataset.color : 'normal';
            this.startGame(name, color);
        });

        // Load game
        document.getElementById('load-btn').addEventListener('click', () => {
            if (!this.loadGame()) {
                alert('No saved game found!');
            }
        });

        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Food buttons
        document.querySelectorAll('.food-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const food = btn.dataset.food;
                const type = btn.dataset.type;
                this.feedDragon(food, type);
            });
        });

        // Give water
        document.getElementById('give-water').addEventListener('click', () => {
            this.giveWater();
        });

        // Action buttons
        document.getElementById('handle-dragon').addEventListener('click', () => {
            this.handleDragon();
        });

        document.getElementById('give-bath').addEventListener('click', () => {
            this.giveBath();
        });

        document.getElementById('clean-tank').addEventListener('click', () => {
            this.cleanTank();
        });

        document.getElementById('play-dragon').addEventListener('click', () => {
            this.playWithDragon();
        });

        // Environment controls
        document.getElementById('basking-temp').addEventListener('input', () => {
            this.updateUI();
        });

        document.getElementById('cool-temp').addEventListener('input', () => {
            this.updateUI();
        });

        document.getElementById('humidity').addEventListener('input', () => {
            this.updateUI();
        });

        document.getElementById('uvb-toggle').addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? 'ON' : 'OFF';
            this.updateUI();
        });

        // Click on dragon
        document.getElementById('dragon').addEventListener('click', () => {
            if (this.dragon) {
                if (this.dragon.isAsleep) {
                    this.addMessage(`Shhh... ${this.dragon.name} is sleeping.`, 'info');
                } else {
                    this.dragon.happiness = Math.min(100, this.dragon.happiness + 2);
                    this.addMessage(`${this.dragon.name} likes the attention!`, 'success');
                    this.updateUI();
                }
            }
        });

        // Enter key on name input
        document.getElementById('name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('start-btn').click();
            }
        });

        // Prevent closing without saving
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });
    }
}

// Initialize game
const game = new BeardedDragonGame();
