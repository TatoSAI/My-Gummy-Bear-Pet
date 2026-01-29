class TamagotchiGame {
    constructor() {
        // Stats
        this.hunger = 100;
        this.happiness = 100;
        this.cleanliness = 100;
        this.energy = 100; // Changed from tiredness - now 100 = full energy, 0 = tired
        this.health = 100;

        // Timers
        this.lastFeedTime = Date.now();
        this.lastPlayTime = Date.now();
        this.lastPoopTime = Date.now();
        this.lastSleepTime = Date.now();
        this.sadnessStartTime = null;
        this.lastComplaintTime = Date.now();
        this.lastDayNightChange = Date.now();

        // Day/Night cycle
        this.isNight = false;
        this.dayNightCycleDuration = 120000; // 2 minutes per cycle (day or night)

        // Poop probability multiplier
        this.poopProbabilityMultiplier = 1;
        this.lastDigestionTime = Date.now(); // Timer for digestion (multiplier decay)
        this.consecutiveFeedWindow = 20000; // 20 seconds window for consecutive feeding

        // Sickness system (triggered by prolonged dirtiness)
        this.isSick = false;
        this.sicknessStartTime = null;
        this.lastDirtinessPenaltyTime = Date.now();

        // Exhaustion collapse system
        this.energyDepletedTime = null; // When energy reached 0
        this.exhaustionCollapseCount = 0; // How many times collapsed from exhaustion
        this.lastCollapseResetTime = Date.now(); // Reset counter every 5 minutes

        // Game state
        this.poopCount = 0;
        this.maxPoops = 5;
        this.isAlive = true;
        this.isSleeping = false; // Track if currently sleeping
        this.currentAnimation = 'idle';
        this.gameOverReason = '';

        // Animation config: [sprite path, total frames, fps, loop, columns, loopStart (optional)]
        // loopStart: if specified, plays frames 0 to loopStart-1 once, then loops from loopStart to end
        this.animations = {
            idle: { sprite: 'assets/bear-idle.png', frames: 36, fps: 10, loop: true, columns: 6 },
            eat: { sprite: 'assets/bear-eat.png', frames: 28, fps: 10, loop: false, columns: 5 },
            walk: { sprite: 'assets/bear-walk.png', frames: 36, fps: 12, loop: true, columns: 6 },
            poop: { sprite: 'assets/bear-poop.png', frames: 16, fps: 10, loop: false, columns: 4 },
            sad: { sprite: 'assets/bear-sad.png', frames: 36, fps: 8, loop: true, columns: 6 },
            sleep: { sprite: 'assets/bear-sleep.png', frames: 36, fps: 8, loop: true, columns: 6, loopStart: 7 },
            happy: { sprite: 'assets/bear-happy.png', frames: 36, fps: 10, loop: true, columns: 6 },
            sick: { sprite: 'assets/bear-sick.png', frames: 36, fps: 8, loop: true, columns: 6 },
            silly: { sprite: 'assets/bear-silly.png', frames: 36, fps: 10, loop: true, columns: 6 }
        };

        // Animation state
        this.currentFrame = 0;
        this.animationTimer = null;
        this.frameSize = 254; // Each frame is 254x254px in the sprite sheet
        this.displaySize = 180; // Display size in the container
        this.scale = this.displaySize / this.frameSize; // Scale factor
        this.isAnimating = false; // Flag to prevent animation interruption
        this.isShowingMessage = false; // Flag to prevent actions during message display

        // Z-index base for depth sorting
        this.baseZIndex = 1000;

        // Audio volumes
        this.masterVolume = 0.7;
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;

        // Flavor dialogues
        this.lastFlavorDialogue = Date.now();
        this.flavorDialogues = {
            day: [
                "Pretty day!",
                "Sun is warm!",
                "Love the sun!",
                "Nice outside!",
                "Birdie sounds!"
            ],
            night: [
                "Stars twinkle!",
                "So quiet...",
                "Moon is big!",
                "Night time~",
                "Hear crickets!"
            ],
            nature: [
                "Smells nice!",
                "Breezy!",
                "Leaves go swoosh!",
                "Pretty flowers!",
                "Soft grass!"
            ],
            happy: [
                "So much fun!",
                "Hehe!",
                "Best day ever!",
                "Wheee!",
                "Happy happy!"
            ],
            tired: [
                "Sleepy...",
                "Yaaawn...",
                "Eyes heavy...",
                "Wanna nap...",
                "*yawn*"
            ],
            hungry_mild: [
                "Mmm... food...",
                "Tummy rumbles...",
                "Snack time?",
                "Smells yummy...",
                "Want treat..."
            ],
            content: [
                "Feel good!",
                "This is nice!",
                "All comfy!",
                "So peaceful...",
                "Cozy here!"
            ]
        };

        // Sound effects
        this.sounds = {
            click: new Audio('sounds/click1.ogg'),
            click2: new Audio('sounds/click_001.ogg'),
            tick: new Audio('sounds/tick_001.ogg')
        };

        // Background music
        this.music = new Audio('music/Gymnopédie No.1.mp3');
        this.music.loop = true;
        this.music.volume = this.musicVolume * this.masterVolume;

        // DOM elements
        this.petSprite = document.getElementById('pet-sprite');
        this.petContainer = document.getElementById('pet-container');
        this.poopContainer = document.getElementById('poop-container');
        this.statusMessage = document.getElementById('status-message');
        this.gameOverScreen = document.getElementById('game-over');

        // Stat bars
        this.hungerBar = document.getElementById('hunger-bar');
        this.happinessBar = document.getElementById('happiness-bar');
        this.energyBar = document.getElementById('energy-bar');
        this.healthBar = document.getElementById('health-bar');

        this.init();
    }

    init() {
        // Add click listener to game over screen
        this.gameOverScreen.addEventListener('click', () => {
            if (this.gameOverScreen.classList.contains('show')) {
                this.restart();
            }
        });
        // Set initial position in center of playable area
        this.petContainer.style.left = '42.5%';
        this.petContainer.style.bottom = '200px';

        // Start with idle animation
        this.setAnimation('idle');

        // Update z-index
        this.updateDepth();

        // Initialize volume controls
        this.initVolumeControls();

        // Start background music
        this.startMusic();

        this.updateStats();
        this.startGameLoop();
    }

    initVolumeControls() {
        const masterSlider = document.getElementById('master-volume');
        const sfxSlider = document.getElementById('sfx-volume');
        const musicSlider = document.getElementById('music-volume');
        const masterValue = document.getElementById('master-value');
        const sfxValue = document.getElementById('sfx-value');
        const musicValue = document.getElementById('music-value');

        // Master volume control
        masterSlider.addEventListener('input', (e) => {
            this.masterVolume = e.target.value / 100;
            this.music.volume = this.musicVolume * this.masterVolume;
            masterValue.textContent = e.target.value + '%';
        });

        // SFX volume control
        sfxSlider.addEventListener('input', (e) => {
            this.sfxVolume = e.target.value / 100;
            sfxValue.textContent = e.target.value + '%';
        });

        // Music volume control
        musicSlider.addEventListener('input', (e) => {
            this.musicVolume = e.target.value / 100;
            this.music.volume = this.musicVolume * this.masterVolume;
            musicValue.textContent = e.target.value + '%';
        });
    }

    startMusic() {
        // Try to start music (may be blocked by browser until user interaction)
        this.music.play().catch(e => {
            console.log('Music autoplay blocked, will start on first interaction');
            // Start music on first click
            const startMusicOnClick = () => {
                this.music.play();
                document.removeEventListener('click', startMusicOnClick);
            };
            document.addEventListener('click', startMusicOnClick);
        });
    }

    updateDepth() {
        // Update bear z-index based on bottom position
        // Lower bottom value = closer to viewer = higher z-index
        const bearBottom = parseFloat(this.petContainer.style.bottom) || 200;
        this.petContainer.style.zIndex = this.baseZIndex - Math.floor(bearBottom);

        // Update all poops z-index based on their individual positions
        const poops = this.poopContainer.querySelectorAll('.poop');
        poops.forEach(poop => {
            const poopBottom = parseFloat(poop.style.bottom) || 200;
            poop.style.zIndex = this.baseZIndex - Math.floor(poopBottom);
        });
    }

    updateDayNight() {
        const gameScreen = document.getElementById('game-screen');
        if (this.isNight) {
            gameScreen.classList.add('night');
            this.showMessage('Night night...');
        } else {
            gameScreen.classList.remove('night');
            this.showMessage('Morning!');
        }
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = this.sfxVolume * this.masterVolume;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    startGameLoop() {
        this.gameInterval = setInterval(() => {
            if (!this.isAlive) return;

            const now = Date.now();

            // Hunger decreases every 15 seconds (30 seconds if sleeping - half speed)
            const hungerInterval = this.isSleeping ? 30000 : 15000;
            if (now - this.lastFeedTime > hungerInterval) {
                this.hunger = Math.max(0, this.hunger - 5);
                this.lastFeedTime = now;
            }

            // Happiness decreases every 20 seconds (40 seconds if sleeping - half speed)
            const happinessInterval = this.isSleeping ? 40000 : 20000;
            if (now - this.lastPlayTime > happinessInterval) {
                this.happiness = Math.max(0, this.happiness - 5);
                this.lastPlayTime = now;
            }

            // Energy decreases slowly over time (every 40 seconds)
            // Double drain at night, BUT doesn't drain while sleeping
            if (!this.isSleeping && now - this.lastSleepTime > 40000) {
                const energyDrain = this.isNight ? 6 : 3;
                this.energy = Math.max(0, this.energy - energyDrain);
                this.lastSleepTime = now;
            }

            // Day/Night cycle
            if (now - this.lastDayNightChange > this.dayNightCycleDuration) {
                this.isNight = !this.isNight;
                this.lastDayNightChange = now;
                this.updateDayNight();
            }

            // Natural digestion: multiplier decreases over time (every 15 seconds)
            if (now - this.lastDigestionTime > 15000) {
                this.poopProbabilityMultiplier = Math.max(1, this.poopProbabilityMultiplier - 0.3);
                this.lastDigestionTime = now;
            }

            // Random poop generation with probability multiplier (slower: 60-90s instead of 40-60s)
            const basePoopTime = 60000 + Math.random() * 30000;
            const adjustedPoopTime = basePoopTime / this.poopProbabilityMultiplier;
            if (now - this.lastPoopTime > adjustedPoopTime) {
                if (this.poopCount < this.maxPoops) {
                    this.createPoop();
                    this.lastPoopTime = now;
                    // Small reduction after pooping
                    this.poopProbabilityMultiplier = Math.max(1, this.poopProbabilityMultiplier - 0.2);
                }
            }

            // Cleanliness decreases with poops
            this.cleanliness = Math.max(0, 100 - (this.poopCount * 20));

            // SICKNESS SYSTEM: Start timer when 3+ poops, get sick after 60 seconds
            if (this.poopCount >= 3) {
                // Start sickness timer if not already started and not sick
                if (!this.isSick && this.sicknessStartTime === null) {
                    this.sicknessStartTime = now;
                }

                // Check if 60 seconds have passed and not yet sick
                if (this.sicknessStartTime !== null && now - this.sicknessStartTime > 60000 && !this.isSick) {
                    this.isSick = true;
                    this.showMessage('Not feeling good...');
                    // Force sick animation immediately
                    if (this.currentAnimation !== 'sick' && !this.isAnimating) {
                        this.setAnimation('sick');
                    }
                }
            } else if (this.poopCount < 3) {
                // Reset sickness timer if cleaned up
                this.sicknessStartTime = null;
            }

            // ESCALATED DIRTINESS PENALTIES (every 10 seconds)
            if (now - this.lastDirtinessPenaltyTime > 10000) {
                this.lastDirtinessPenaltyTime = now;

                // 2 poops (60% clean): Minor happiness loss
                if (this.poopCount >= 2) {
                    this.happiness = Math.max(0, this.happiness - 3);
                }

                // 3 poops (40% clean): More happiness loss
                if (this.poopCount >= 3) {
                    this.happiness = Math.max(0, this.happiness - 5);
                }

                // 4 poops (20% clean): Toxic environment - affects energy too
                if (this.poopCount >= 4) {
                    this.happiness = Math.max(0, this.happiness - 7);
                    this.energy = Math.max(0, this.energy - 5);
                }

                // 5 poops (0% clean): Critical state - all stats degrade
                if (this.poopCount >= 5) {
                    this.happiness = Math.max(0, this.happiness - 10);
                    this.energy = Math.max(0, this.energy - 8);
                    this.hunger = Math.max(0, this.hunger - 5); // Too stressed to eat properly
                }
            }

            // Health damage from various conditions
            // Not eating (hunger < 20) damages health
            if (this.hunger < 20) {
                this.health = Math.max(0, this.health - 0.5);
            }

            // ESCALATED HEALTH DAMAGE FROM DIRTINESS
            if (this.poopCount >= 3) {
                // Base damage from dirtiness (cleanliness < 40)
                this.health = Math.max(0, this.health - 0.4);
            }

            if (this.poopCount >= 4) {
                // Increased damage (cleanliness < 20)
                this.health = Math.max(0, this.health - 0.6);
            }

            if (this.poopCount >= 5) {
                // Critical damage (cleanliness = 0)
                this.health = Math.max(0, this.health - 1.0);
            }

            // SICKNESS DAMAGE: If bear is sick, health degrades faster
            if (this.isSick) {
                this.health = Math.max(0, this.health - 0.8);
            }

            // EXHAUSTION COLLAPSE SYSTEM: If energy = 0 for too long, bear collapses and sleeps
            if (this.energy === 0 && !this.isSleeping) {
                // Start timer when energy reaches 0
                if (this.energyDepletedTime === null) {
                    this.energyDepletedTime = now;
                }

                // After 30 seconds with energy = 0, force sleep (collapse)
                if (now - this.energyDepletedTime > 30000 && !this.isAnimating) {
                    this.exhaustionCollapseCount++;
                    this.energyDepletedTime = null; // Reset timer
                    this.showMessage('So sleepy...');

                    // Force sleep due to exhaustion (longer sleep: 15s)
                    this.performExhaustionSleep();

                    // If collapsed 3+ times in last 5 minutes, high chance of getting sick
                    if (this.exhaustionCollapseCount >= 3 && !this.isSick) {
                        if (Math.random() < 0.7) { // 70% chance
                            this.isSick = true;
                            this.showMessage('Feel icky...');
                        }
                    }
                }
            } else if (this.energy > 0) {
                // Reset exhaustion timer if energy recovers
                this.energyDepletedTime = null;
            }

            // Reset exhaustion collapse counter every 5 minutes
            if (now - this.lastCollapseResetTime > 300000) {
                this.exhaustionCollapseCount = 0;
                this.lastCollapseResetTime = now;
            }

            // Game over if health reaches 0
            if (this.health <= 0) {
                this.gameOverReason = 'sick';
                this.gameOver();
                return;
            }

            // Check if any stat is at 0
            const criticalState = this.hunger === 0 || this.happiness === 0 || this.cleanliness === 0;

            if (criticalState) {
                if (this.sadnessStartTime === null) {
                    this.sadnessStartTime = now;
                    // Sick takes priority over sad
                    if (this.isSick) {
                        this.setAnimation('sick');
                    } else {
                        this.setAnimation('sad');
                    }
                }

                // Game over time depends on the condition (increased from 60s to 90s)
                let gameOverTime = 90000; // Default: 90 seconds (was 60s)

                // Faster game over if dirty (45 seconds instead of 90, was 30s)
                if (this.cleanliness === 0) {
                    gameOverTime = 45000;
                }

                if (now - this.sadnessStartTime > gameOverTime) {
                    // Determine which stat caused game over
                    if (this.hunger === 0) {
                        this.gameOverReason = 'hungry';
                    } else if (this.happiness === 0) {
                        this.gameOverReason = 'sad';
                    } else if (this.cleanliness === 0) {
                        this.gameOverReason = 'dirty';
                    }
                    this.gameOver();
                }
            } else {
                // Priority: sick > sad > idle
                // Check if pet is sick (highest priority)
                if (this.isSick) {
                    // Sick animation can interrupt these animations (NOT walk)
                    const interruptibleAnimations = ['idle', 'sad', 'happy'];
                    if (this.currentAnimation !== 'sick' && interruptibleAnimations.includes(this.currentAnimation)) {
                        this.setAnimation('sick');
                    }
                }
                // Check if pet becomes sad (low stats but not 0)
                else if (!this.isSick) {
                    const isSad = this.hunger < 30 || this.happiness < 30 || this.cleanliness < 30;

                    if (isSad) {
                        if (!this.isAnimating && this.currentAnimation !== 'sad' && this.sadnessStartTime === null) {
                            this.setAnimation('sad');
                        }
                    } else {
                        this.sadnessStartTime = null;
                        if (!this.isAnimating && (this.currentAnimation === 'sad' || this.currentAnimation === 'sick')) {
                            this.setAnimation('idle');
                        }
                    }
                }
            }

            this.updateStats();
            this.checkRandomAnimations();
            this.checkNeeds();

            // Random flavor dialogues (low probability)
            if (Math.random() < 0.01) { // 1% chance per second
                this.showFlavorDialogue();
            }

        }, 1000);
    }

    checkNeeds() {
        const now = Date.now();

        // Don't interrupt animations with complaints
        if (this.isAnimating) return;

        // Only complain every 15 seconds to avoid spam
        if (now - this.lastComplaintTime < 15000) return;

        // Priority order: sickness, health, dirtiness, hunger, energy, happiness
        if (this.isSick) {
            this.showMessage('Feel bad...');
            this.lastComplaintTime = now;
        } else if (this.health < 30) {
            this.showMessage('Owwie...');
            this.lastComplaintTime = now;
        } else if (this.poopCount >= 4) {
            this.showMessage("Stinky here!");
            this.lastComplaintTime = now;
        } else if (this.hunger < 30) {
            this.showMessage("Tummy hurts...");
            this.lastComplaintTime = now;
        } else if (this.energy < 30) {
            this.showMessage("So sleepy...");
            this.lastComplaintTime = now;
        } else if (this.happiness < 30) {
            this.showMessage("Bored...");
            this.lastComplaintTime = now;
        }
    }

    showFlavorDialogue() {
        const now = Date.now();

        // Don't show if busy or recently showed one
        if (this.isAnimating || this.isShowingMessage) return;
        if (now - this.lastFlavorDialogue < 30000) return; // At least 30 seconds between flavor dialogues

        // Build list of appropriate dialogues based on current state
        let availableDialogues = [];

        // Time-based dialogues
        if (this.isNight) {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.night);
        } else {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.day);
        }

        // Always add nature dialogues
        availableDialogues = availableDialogues.concat(this.flavorDialogues.nature);

        // State-based dialogues (only if stats are good, not critical)
        if (this.happiness > 70) {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.happy);
        }

        if (this.energy > 40 && this.energy < 70) {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.tired);
        }

        if (this.hunger > 40 && this.hunger < 70) {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.hungry_mild);
        }

        // If everything is relatively good, add content dialogues
        if (this.health > 60 && this.happiness > 60 && this.hunger > 60 && this.energy > 60) {
            availableDialogues = availableDialogues.concat(this.flavorDialogues.content);
        }

        // Pick a random dialogue
        if (availableDialogues.length > 0) {
            const randomDialogue = availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
            this.showMessage(randomDialogue);
            this.lastFlavorDialogue = now;
        }
    }

    checkRandomAnimations() {
        // Don't interrupt important animations or messages
        if (this.isAnimating || this.isShowingMessage) return;
        if (this.currentAnimation !== 'idle' && this.currentAnimation !== 'sad') return;

        // Random walk animation
        if (Math.random() < 0.02) {
            this.moveToRandomPosition();
        }

        // Random sleep animation only if very tired (energy <= 30)
        if (this.energy <= 30 && Math.random() < 0.005) {
            this.performSleep();
        }

        // Random happy animation when happiness is very high (>= 90)
        if (this.happiness >= 90 && Math.random() < 0.008) {
            this.performHappy();
        }
    }

    moveToRandomPosition(forceLongDistance = false) {
        // Define playable area boundaries (center area of background)
        const minLeft = 15; // percentage
        const maxLeft = 70; // percentage
        const minBottom = 150; // pixels
        const maxBottom = 250; // pixels

        const currentLeft = parseFloat(this.petContainer.style.left) || 42.5;

        let newLeft, newBottom;

        if (forceLongDistance) {
            // Move far away (at least 30% distance)
            const direction = Math.random() < 0.5 ? -1 : 1;
            newLeft = currentLeft + (direction * (30 + Math.random() * 20));
            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        } else {
            // Random position within bounds
            newLeft = minLeft + Math.random() * (maxLeft - minLeft);
        }

        // Random position within bounds
        newBottom = minBottom + Math.random() * (maxBottom - minBottom);

        // Determine direction for sprite flip
        const movingRight = newLeft > currentLeft;

        this.setAnimation('walk');

        // Flip sprite based on direction
        if (movingRight) {
            this.petContainer.style.transform = 'translateX(-50%) scaleX(1)';
        } else {
            this.petContainer.style.transform = 'translateX(-50%) scaleX(-1)';
        }

        // Animate movement
        this.petContainer.style.transition = 'left 2s ease-in-out, bottom 2s ease-in-out';
        this.petContainer.style.left = newLeft + '%';
        this.petContainer.style.bottom = newBottom + 'px';

        // Update z-index during movement
        const moveInterval = setInterval(() => {
            this.updateDepth();
        }, 50);

        setTimeout(() => {
            clearInterval(moveInterval);
            this.updateDepth(); // Final update
            if (this.currentAnimation === 'walk') {
                this.setAnimation('idle');
                this.petContainer.style.transform = 'translateX(-50%) scaleX(1)';
            }
        }, 2000);
    }

    feed() {
        if (!this.isAlive) return;
        if (this.isShowingMessage) return;
        this.playSound('click');

        // Don't interrupt current animation
        if (this.isAnimating) {
            this.showMessage('Wait!');
            return;
        }

        // Check if already full
        if (this.hunger >= 90) {
            this.showMessage("Too full!");
            this.health = Math.max(0, this.health - 10);
            this.updateStats();
            return;
        }

        const now = Date.now();

        // Check if this is consecutive feeding (within 20 seconds of last feed)
        const timeSinceLastFeed = now - this.lastFeedTime;
        if (timeSinceLastFeed < this.consecutiveFeedWindow) {
            // Consecutive feeding increases poop multiplier (overeating)
            this.poopProbabilityMultiplier = Math.min(3, this.poopProbabilityMultiplier + 0.5);
        }
        // If feeding is well-spaced, multiplier stays the same or continues natural decay

        this.hunger = Math.min(100, this.hunger + 30);
        this.lastFeedTime = now;

        this.isAnimating = true; // Prevent interruption during eating
        this.setAnimation('eat');
        this.showMessage('Yum yum!');
        this.petContainer.classList.add('bounce');

        // Eat animation: 28 frames at 10fps = 2.8s
        setTimeout(() => {
            this.petContainer.classList.remove('bounce');
            this.isAnimating = false; // Animation finished

            // After eating, if very happy, sometimes do silly animation
            if (this.happiness > 75 && Math.random() < 0.3) {
                setTimeout(() => {
                    if (!this.isAnimating) {
                        this.performSilly();
                    }
                }, 500);
            }
        }, 2800);

        this.updateStats();
    }

    play() {
        if (!this.isAlive) return;
        if (this.isShowingMessage) return;
        this.playSound('click');

        // Don't interrupt current animation
        if (this.isAnimating) {
            this.showMessage('Wait!');
            return;
        }

        // Check if too tired (low energy)
        if (this.energy <= 20) {
            this.showMessage("Too tired...");
            this.health = Math.max(0, this.health - 15);
            this.energy = Math.max(0, this.energy - 10);
            this.updateStats();
            return;
        }

        if (this.happiness >= 90) {
            // Too happy, doesn't want to play
            this.showMessage("Not now!");
            return;
        }

        this.happiness = Math.min(100, this.happiness + 30);
        this.lastPlayTime = Date.now();

        // Playing uses energy and makes hungry
        this.energy = Math.max(0, this.energy - 20);
        this.hunger = Math.max(0, this.hunger - 15);

        this.showMessage('Yippee!');

        // Show hearts above the bear
        this.showHearts();

        // Use happy animation when playing
        this.performHappy();

        this.updateStats();
    }

    showHearts() {
        const numHearts = 3 + Math.floor(Math.random() * 3); // 3-5 hearts

        for (let i = 0; i < numHearts; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.className = 'heart';
                heart.textContent = '❤️';

                // Position randomly above the bear
                const bearRect = this.petContainer.getBoundingClientRect();
                const gameRect = document.getElementById('game-screen').getBoundingClientRect();

                const leftOffset = (Math.random() - 0.5) * 80; // Random horizontal offset
                heart.style.left = (bearRect.left - gameRect.left + bearRect.width / 2 + leftOffset) + 'px';
                heart.style.top = (bearRect.top - gameRect.top - 20) + 'px';

                document.getElementById('game-screen').appendChild(heart);

                // Remove after animation
                setTimeout(() => {
                    heart.remove();
                }, 1500);
            }, i * 150); // Stagger hearts
        }
    }

    clean() {
        if (!this.isAlive) return;
        if (this.isShowingMessage) return;
        this.playSound('tick');

        if (this.poopCount === 0) {
            this.showMessage('All clean!');
            return;
        }

        // Calculate bonus based on how dirty it was
        const wasVerydirty = this.poopCount >= 4;
        const happinessBonus = wasVerydirty ? 20 : 10;

        // Remove all poops
        this.poopContainer.innerHTML = '';
        this.poopCount = 0;
        this.cleanliness = 100;
        this.happiness = Math.min(100, this.happiness + happinessBonus);

        // Reset sickness timer (prevents getting sick), but does NOT cure existing sickness
        this.sicknessStartTime = null;

        // Show appropriate message
        if (this.isSick) {
            this.showMessage('Better! Still icky...');
        } else {
            this.showMessage('Sparkly clean!');
        }

        this.updateStats();
    }

    sleep() {
        if (!this.isAlive) return;
        if (this.isShowingMessage) return;
        this.playSound('click2');

        // Don't interrupt current animation
        if (this.isAnimating) {
            this.showMessage('Wait!');
            return;
        }

        // Check if has enough energy (energy > 70, more lenient since sleep is longer now)
        if (this.energy > 70) {
            this.showMessage("Not sleepy!");
            this.happiness = Math.max(0, this.happiness - 15);
            this.updateStats();
            return;
        }

        this.performSleep();
    }

    performSleep() {
        this.isAnimating = true;
        this.isSleeping = true; // Mark as sleeping to affect decay rates
        this.setAnimation('sleep');
        this.showMessage('Zzz...');

        // Sleep duration: longer at night (12s) vs day (10s)
        const sleepDuration = this.isNight ? 12000 : 10000;

        // Restore energy while sleeping (10 per second)
        const sleepInterval = setInterval(() => {
            if (this.currentAnimation === 'sleep') {
                this.energy = Math.min(100, this.energy + 10);
                this.updateStats();
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(sleepInterval);
            this.isAnimating = false;
            this.isSleeping = false; // Wake up
            if (this.currentAnimation === 'sleep') {
                this.setAnimation('idle');
            }
        }, sleepDuration);
    }

    performExhaustionSleep() {
        this.isAnimating = true;
        this.isSleeping = true;
        this.setAnimation('sleep');

        // Exhaustion sleep is longer (15 seconds) because they collapsed
        const sleepDuration = 15000;

        // Restore energy while sleeping (slower: 8 per second instead of 10)
        const sleepInterval = setInterval(() => {
            if (this.currentAnimation === 'sleep') {
                this.energy = Math.min(100, this.energy + 8);
                this.updateStats();
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(sleepInterval);
            this.isAnimating = false;
            this.isSleeping = false;
            if (this.currentAnimation === 'sleep') {
                // Show warning message after waking
                setTimeout(() => {
                    this.showMessage('Still tired...');
                }, 500);
                this.setAnimation('idle');
            }
        }, sleepDuration);
    }

    performHappy() {
        this.isAnimating = true;
        this.setAnimation('happy');

        const happyMessages = [
            'Yay!',
            'Wheee!',
            'Fun fun!',
            'Love this!',
            'Best!'
        ];
        const randomMessage = happyMessages[Math.floor(Math.random() * happyMessages.length)];
        this.showMessage(randomMessage);

        // Wait for happy animation to show, THEN move
        setTimeout(() => {
            this.isAnimating = false;

            // Move to random position after showing happy animation
            if (this.currentAnimation === 'happy') {
                this.moveToRandomPosition();
            }
        }, 2000);
    }

    performSilly() {
        this.isAnimating = true;
        this.setAnimation('silly');

        const sillyMessages = [
            'Hehe!',
            'Silly time!',
            'Watch!',
            'Tada!',
            'Look!'
        ];
        const randomMessage = sillyMessages[Math.floor(Math.random() * sillyMessages.length)];
        this.showMessage(randomMessage);

        setTimeout(() => {
            this.isAnimating = false;
            if (this.currentAnimation === 'silly') {
                this.setAnimation('idle');
            }
        }, 3000);
    }

    giveMedicine() {
        if (!this.isAlive) return;
        if (this.isShowingMessage) return;
        this.playSound('click2');

        // Don't interrupt current animation
        if (this.isAnimating) {
            this.showMessage('Wait!');
            return;
        }

        // Check if health is already at maximum and not sick
        if (this.health >= 90 && !this.isSick) {
            this.showMessage("Don't need!");
            return;
        }

        // Cure sickness if sick
        const wasSick = this.isSick;
        if (this.isSick) {
            this.isSick = false;
            this.sicknessStartTime = null;
            this.health = Math.min(100, this.health + 40); // More health recovery when sick
            this.happiness = Math.max(0, this.happiness - 10); // Less happiness penalty when actually sick
            this.showMessage('Blegh! Yucky!');
        } else {
            // Normal medicine use
            this.health = Math.min(100, this.health + 30);
            this.happiness = Math.max(0, this.happiness - 20);
            this.showMessage('Yuck!');
        }

        // Change animation from sick to appropriate state after curing
        if (wasSick && this.currentAnimation === 'sick') {
            // Check updated stats after medicine
            const isSad = this.hunger < 30 || this.happiness < 30 || this.cleanliness < 30;
            if (isSad) {
                this.setAnimation('sad');
            } else {
                this.setAnimation('idle');
            }
        }

        this.updateStats();
    }

    createPoop() {
        if (this.poopCount >= this.maxPoops) return;

        // Don't interrupt current animation
        if (this.isAnimating) return;

        // Get current bear position before animation
        const currentLeft = parseFloat(this.petContainer.style.left) || 42.5;
        const currentBottom = parseFloat(this.petContainer.style.bottom) || 75;

        this.setAnimation('poop');
        this.showMessage('Oopsie!');

        // Wait for poop animation to finish (16 frames at 10fps = 1.6s)
        // Create poop element near the end
        setTimeout(() => {
            const poop = document.createElement('div');
            poop.className = 'poop';

            // Position poop above the bear (behind in perspective)
            const poopBottom = currentBottom + 50; // 50px above bear's position for depth
            poop.style.left = currentLeft + '%';
            poop.style.bottom = poopBottom + 'px';
            poop.innerHTML = '<img src="assets/poop.png" alt="poop">';

            // Set z-index based on poop position
            poop.style.zIndex = this.baseZIndex - Math.floor(poopBottom);

            poop.addEventListener('click', () => {
                poop.remove();
                this.poopCount--;
                this.cleanliness = Math.min(100, 100 - (this.poopCount * 20));
                this.showMessage('Gone!');
                this.updateStats();
                this.updateDepth(); // Update depths after removing poop
            });

            this.poopContainer.appendChild(poop);
            this.poopCount++;
            this.cleanliness = Math.max(0, 100 - (this.poopCount * 20));
            this.updateStats();
            this.updateDepth(); // Update depths after adding poop

            // Move bear far away after pooping
            setTimeout(() => {
                this.moveToRandomPosition(true); // Force long distance movement
            }, 300);
        }, 1400);
    }

    setAnimation(animName) {
        if (!this.animations[animName]) return;

        const anim = this.animations[animName];

        // Don't interrupt non-looping animations (eat, poop, sleep, silly)
        const interruptibleAnimations = ['idle', 'walk', 'sad', 'happy', 'sick'];
        if (this.isAnimating && !interruptibleAnimations.includes(this.currentAnimation)) {
            return; // Don't interrupt important animations
        }

        // Mark as animating if it's a non-looping animation
        if (!anim.loop) {
            this.isAnimating = true;
        }

        // Stop current animation
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
        }

        // Set sprite sheet
        this.currentAnimation = animName;
        this.currentFrame = 0;
        this.petSprite.style.backgroundImage = `url('${anim.sprite}')`;

        // Calculate sprite sheet dimensions with scale
        const rows = Math.ceil(anim.frames / anim.columns);
        const sheetWidth = anim.columns * this.frameSize * this.scale;
        const sheetHeight = rows * this.frameSize * this.scale;
        this.petSprite.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;

        // Calculate frame duration in ms
        const frameDuration = 1000 / anim.fps;

        // Update frame
        const updateFrame = () => {
            const row = Math.floor(this.currentFrame / anim.columns);
            const col = this.currentFrame % anim.columns;

            const x = -col * this.frameSize * this.scale;
            const y = -row * this.frameSize * this.scale;

            this.petSprite.style.backgroundPosition = `${x}px ${y}px`;

            this.currentFrame++;

            // Handle loop or end
            if (this.currentFrame >= anim.frames) {
                if (anim.loop) {
                    // If loopStart is defined, loop back to that frame instead of 0
                    // This allows for "intro + loop" animations (e.g., eyes closing, then sleeping loop)
                    this.currentFrame = anim.loopStart !== undefined ? anim.loopStart : 0;
                } else {
                    // Animation finished, go back to idle
                    clearInterval(this.animationTimer);
                    this.animationTimer = null;
                    this.isAnimating = false; // Mark as not animating
                    setTimeout(() => {
                        if (this.currentAnimation === animName) {
                            this.setAnimation('idle');
                        }
                    }, frameDuration);
                }
            }
        };

        // Start animation loop
        updateFrame(); // Show first frame immediately
        this.animationTimer = setInterval(updateFrame, frameDuration);
    }

    showMessage(message) {
        this.statusMessage.textContent = message;
        this.isShowingMessage = true;

        // Position message above the bear
        const bearRect = this.petContainer.getBoundingClientRect();
        const gameRect = document.getElementById('game-screen').getBoundingClientRect();

        // Calculate position relative to game screen
        const bearCenterX = bearRect.left - gameRect.left + bearRect.width / 2;
        const bearTop = bearRect.top - gameRect.top;

        this.statusMessage.style.left = bearCenterX + 'px';
        this.statusMessage.style.top = (bearTop - 60) + 'px';
        this.statusMessage.style.transform = 'translateX(-50%)';

        this.statusMessage.classList.add('show');

        setTimeout(() => {
            this.statusMessage.classList.remove('show');
            this.isShowingMessage = false;
        }, 2000);
    }

    updateStats() {
        // Update bars
        this.hungerBar.style.width = this.hunger + '%';
        this.happinessBar.style.width = this.happiness + '%';
        this.energyBar.style.width = this.energy + '%';
        this.healthBar.style.width = this.health + '%';
    }

    gameOver() {
        this.isAlive = false;
        this.isAnimating = false;
        clearInterval(this.gameInterval);
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
        }
        this.music.pause();

        // Hide pet and stats
        this.petContainer.style.display = 'none';
        document.querySelector('.stats-panel').style.display = 'none';

        // Set game over message based on reason
        const gameOverReasonElement = document.getElementById('game-over-reason');
        const messages = {
            sad: "Your bear was feeling too sad and went to find happiness somewhere else...",
            hungry: "Your bear was too hungry and went looking for food in the forest...",
            sick: "Your bear wasn't feeling well and went to rest in a cozy cave...",
            dirty: "Your bear decided to go find a cleaner place to play...",
            default: "Your bear decided to take a long adventure break..."
        };

        gameOverReasonElement.textContent = messages[this.gameOverReason] || messages.default;

        this.gameOverScreen.classList.add('show');
    }

    restart() {
        // Reset stats
        this.hunger = 100;
        this.happiness = 100;
        this.cleanliness = 100;
        this.energy = 100;
        this.health = 100;

        // Reset timers
        this.lastFeedTime = Date.now();
        this.lastPlayTime = Date.now();
        this.lastPoopTime = Date.now();
        this.lastSleepTime = Date.now();
        this.sadnessStartTime = null;
        this.lastComplaintTime = Date.now();
        this.lastDayNightChange = Date.now();
        this.lastFlavorDialogue = Date.now();

        // Reset day/night
        this.isNight = false;
        document.getElementById('game-screen').classList.remove('night');

        // Reset multipliers
        this.poopProbabilityMultiplier = 1;
        this.lastDigestionTime = Date.now();

        // Reset sickness system
        this.isSick = false;
        this.sicknessStartTime = null;
        this.lastDirtinessPenaltyTime = Date.now();

        // Reset exhaustion collapse system
        this.energyDepletedTime = null;
        this.exhaustionCollapseCount = 0;
        this.lastCollapseResetTime = Date.now();

        // Reset game state
        this.poopCount = 0;
        this.isAlive = true;
        this.isSleeping = false;
        this.currentAnimation = 'idle';
        this.isAnimating = false;
        this.gameOverReason = '';

        // Clear poops
        this.poopContainer.innerHTML = '';

        // Show pet and stats again
        this.petContainer.style.display = 'block';
        document.querySelector('.stats-panel').style.display = 'grid';

        // Reset position
        this.petContainer.style.transition = 'none';
        this.petContainer.style.left = '42.5%';
        this.petContainer.style.bottom = '200px';
        this.petContainer.style.transform = 'translateX(-50%) scaleX(1)';
        setTimeout(() => {
            this.petContainer.style.transition = 'left 2s ease-in-out, bottom 2s ease-in-out';
        }, 50);

        // Hide game over screen
        this.gameOverScreen.classList.remove('show');

        // Reset animation
        this.setAnimation('idle');

        // Restart music
        this.music.currentTime = 0;
        this.music.play();

        // Update display
        this.updateStats();

        // Restart game loop
        this.startGameLoop();
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new TamagotchiGame();
});

// Toggle guide modal
function toggleGuide() {
    const guideModal = document.getElementById('guide-modal');
    guideModal.classList.toggle('show');
}
