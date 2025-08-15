document.addEventListener('DOMContentLoaded', () => {
    // --- Page Entry Logic ---
    const enterButton = document.getElementById('enter-galaxy-button');
    const landingPage = document.getElementById('landing-page');
    const mainContent = document.getElementById('main-content');
    let recognitionStarted = false;

    // Airplane/Rocket sound effect
    const noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.01, decay: 1.5, sustain: 0.1 }
    }).toDestination();
    const filter = new Tone.AutoFilter({
        frequency: '8m',
        baseFrequency: 200,
        octaves: 2.6
    }).toDestination().start();
    noiseSynth.connect(filter);
    
    enterButton.addEventListener('click', () => {
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        // Play airplane/rocket sound
        noiseSynth.triggerAttackRelease("1.5");

        // Fade out landing page
        landingPage.style.opacity = '0';

        // After fade out, hide landing and show main content
        setTimeout(() => {
            landingPage.style.display = 'none';
            mainContent.classList.remove('hidden');
            mainContent.classList.add('fade-in');
            // Start speech recognition after user enters
            if (recognition && !recognitionStarted) {
                try {
                   recognition.start();
                   recognitionStarted = true;
                } catch(e) {
                   console.error("Recognition could not be started:", e);
                }
            }
        }, 500); // 500ms matches the transition duration
    });

    // --- Animated Subtitle Logic ---
    const subtitleEl = document.getElementById('animated-subtitle');
    const subtitleText = "Full Stack Developer";
    if(subtitleEl) {
        subtitleEl.innerHTML = subtitleText.split('').map((char, index) =>
            `<span style="animation-delay: ${index * 0.1}s">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
    }

    // --- AI Voice Synthesis and Recognition ---
    const aiVoiceButton = document.getElementById('ai-voice-button');
    
    // Function to speak text using Web Speech API
    function speak(text) {
        if ('speechSynthesis' in window) {
            // Cancel any previous speech to prevent overlap
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.pitch = 1.2;
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            console.log('Speech synthesis not supported in this browser.');
        }
    }
    
    // Click listener for the microphone icon
    aiVoiceButton.addEventListener('click', () => {
        speak('Hey, how can I help you?');
    });

    // Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    const commands = {
        'open youtube': 'https://www.youtube.com',
        'open google': 'https://www.google.com',
        'open linkedin': 'https://www.linkedin.com/in/abhishek-gidd/',
        'open github': 'https://github.com/Abhigidd'
    };

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.toLowerCase().trim();

            console.log('Voice command received:', command); // For debugging

            if (command.includes('hey cosmic ai assistant') || command.includes('hey cosmic ai')) {
                console.log('Activation phrase detected!');
                speak('How can I help you?');
                return;
            }
            
            for (const phrase in commands) {
                if (command.includes(phrase)) {
                    const url = commands[phrase];
                    const appName = phrase.replace('open ', '');
                    console.log(`Command detected: ${phrase}. Opening ${appName}.`);
                    speak(`Opening ${appName}`);
                    window.open(url, '_blank');
                    return; // Stop after executing a command
                }
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
               console.error('Speech recognition error:', event.error);
            }
        };

        recognition.onend = () => {
            if (recognitionStarted) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("Could not restart recognition:", e);
                    }
                }, 250); 
            }
        };
    } else {
        console.log('Speech recognition not supported in this browser.');
        aiVoiceButton.style.display = 'none'; // Hide mic icon if not supported
    }


    // --- Gemini API Integration ---
    const askAiButton = document.getElementById('ask-ai-button');
    const aiPrompt = document.getElementById('ai-prompt');
    const aiResponseEl = document.getElementById('ai-response');
    const loader = document.getElementById('loader');
    const aiResponseContainer = document.getElementById('ai-response-container');

    function typewriterEffect(element, text, speed = 30) {
        element.textContent = '';
        aiResponseContainer.classList.add('typing');
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                aiResponseContainer.classList.remove('typing');
            }
        }, speed);
    }

    const callGeminiApi = async (prompt, retries = 3, delay = 1000) => {
        loader.classList.remove('hidden');
        aiResponseEl.textContent = '';
        
        const apiKey = ""; // API key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    typewriterEffect(aiResponseEl, text);
                } else {
                   aiResponseEl.textContent = 'Sorry, the cosmos is silent right now. Please try again.';
                }
                loader.classList.add('hidden');
                return; // Exit after successful call
            } catch (error) {
                console.error('Error calling Gemini API:', error);
                if (i === retries - 1) {
                    aiResponseEl.textContent = 'Error contacting the AI. Please check the console for details.';
                    loader.classList.add('hidden');
                } else {
                    // Wait before retrying
                    await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
                }
            }
        }
    };

    askAiButton.addEventListener('click', () => {
        const promptText = aiPrompt.value.trim();
        if (promptText) {
            callGeminiApi(promptText);
        } else {
            aiResponseEl.textContent = 'Please enter a prompt to ask the AI.';
        }
    });


    // --- Three.js Scene ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg-canvas'),
        alpha: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    // Starfield
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Lighting
    const pointLight = new THREE.PointLight(0xffffff, 2, 300);
    scene.add(pointLight);
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33, wireframe: true });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Planet creation function
    function createPlanet(size, color, distance, speed) {
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const planet = new THREE.Mesh(geometry, material);
        const pivot = new THREE.Object3D();
        sun.add(pivot);
        pivot.add(planet);
        planet.position.x = distance;
        return { planet, pivot, speed };
    }

    const planets = [
        createPlanet(0.8, 0xaaaaaa, 10, 0.01),
        createPlanet(1.2, 0xffa500, 15, 0.007),
        createPlanet(1.4, 0x0077ff, 20, 0.005),
        createPlanet(1.0, 0xff4500, 25, 0.004)
    ];

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0001;
        sun.rotation.y += 0.002;
        planets.forEach(p => {
            p.pivot.rotation.y += p.speed;
            p.planet.rotation.y += 0.01;
        });
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
        camera.position.y += (mouseY * 5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    animate();

    // Handle Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
