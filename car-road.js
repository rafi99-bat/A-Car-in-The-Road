// Prevent context menu on right-click
window.addEventListener('contextmenu', function (e) {
    e.preventDefault();
}, false);

// Handle window resize events
window.addEventListener('resize', function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Initialize global variables
let car = null;
let road = null;
let grass = null;
let wheels = [];
let pointLight, directionalLight, ambientLight, moon;
let moveUp, moveDown, moveLeft, moveRight;
let rotateUp, rotateDown, rotateLeft, rotateRight;
let zoomIn, zoomOut;
let skyBoxBrightness = 0.3;
let isDayTime = true;
let cycleSpeed = 0.00015;

// Initialize the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load the skybox
var skyBoxTexture = new THREE.CubeTextureLoader().load([
    "texture/sky/posx.jpg",
    "texture/sky/posx.jpg",
    "texture/sky/posy.jpg",
    "texture/sky/negy.jpg",
    "texture/sky/posx.jpg",
    "texture/sky/posx.jpg"
]);

const skyBoxShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        'envMap': { value: skyBoxTexture },
        'brightness': { value: skyBoxBrightness },
        'dayColor': { value: new THREE.Color(0x87CEEB) },
        'nightColor': { value: new THREE.Color(0x000033) },
        'dawnDuskColor': { value: new THREE.Color(0xB33000) },
        'timeOfDay': { value: 0 }
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform samplerCube envMap;
        uniform float brightness;
        uniform vec3 dayColor;
        uniform vec3 nightColor;
        uniform vec3 dawnDuskColor;
        uniform float timeOfDay;
        varying vec3 vWorldPosition;
        void main() {
            vec3 envColor = textureCube(envMap, normalize(vWorldPosition)).rgb;

            // Compute the sky color based on the time of day
            vec3 skyColor;
            if (timeOfDay < 0.25) {
                // Dawn
                skyColor = mix(nightColor, dawnDuskColor, smoothstep(0.0, 0.25, timeOfDay));
            } else if (timeOfDay < 0.5) {
                // Day
                skyColor = mix(dawnDuskColor, dayColor, smoothstep(0.25, 0.5, timeOfDay));
            } else if (timeOfDay < 0.75) {
                // Dusk
                skyColor = mix(dayColor, dawnDuskColor, smoothstep(0.5, 0.75, timeOfDay));
            } else {
                // Night
                skyColor = mix(dawnDuskColor, nightColor, smoothstep(0.75, 1.0, timeOfDay));
            }

            gl_FragColor = vec4(envColor * brightness * skyColor, 1.0);
        }
    `,
    side: THREE.BackSide
});

const skyBoxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
const skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxShaderMaterial);
scene.add(skyBox);

// Load the grass
const textureLoader = new THREE.TextureLoader();
textureLoader.load('texture/grass.jpg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const geometry = new THREE.PlaneGeometry(80, 80);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    grass = new THREE.Mesh(geometry, material);
    grass.rotation.x = -Math.PI / 2;
    scene.add(grass);
});

// Load the road
textureLoader.load('texture/road.jpg', function(texture) {
    texture.rotation = -Math.PI / 2;
    texture.center.set(0.5, 0.5);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);

    const geometry = new THREE.PlaneGeometry(10, 80);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    road = new THREE.Mesh(geometry, material);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    scene.add(road);

    // Add trees around the road
    const fieldPositions = [
        [-5, 35], [-5, 30], [-5, 25], [-5, 20], [-5, 15], [-5, 10], [-5, 5], [-5, 0], [-5, -5], [-5, -10], [-5, -15], [-5, -20], [-5, -25], [-5, -30], [-5, -35],
        [-10, 35], [-10, 30], [-10, 25], [-10, 20], [-10, 15], [-10, 10], [-10, 5], [-10, 0], [-10, -5], [-10, -10], [-10, -15], [-10, -20], [-10, -25], [-10, -30], [-10, -35],
        [-15, 35], [-15, 30], [-15, 25], [-15, 20], [-15, 15], [-15, 10], [-15, 5], [-15, 0], [-15, -5], [-15, -10], [-15, -15], [-15, -20], [-15, -25], [-15, -30], [-15, -35],
        [-20, 35], [-20, 30], [-20, 25], [-20, 20], [-20, 15], [-20, 10], [-20, 5], [-20, 0], [-20, -5], [-20, -10], [-20, -15], [-20, -20], [-20, -25], [-20, -30], [-20, -35],
        [-25, 35], [-25, 30], [-25, 25], [-25, 20], [-25, 15], [-25, 10], [-25, 5], [-25, 0], [-25, -5], [-25, -10], [-25, -15], [-25, -20], [-25, -25], [-25, -30], [-25, -35],
        [-30, 35], [-30, 30], [-30, 25], [-30, 20], [-30, 15], [-30, 10], [-30, 5], [-30, 0], [-30, -5], [-30, -10], [-30, -15], [-30, -20], [-30, -25], [-30, -30], [-30, -35],
        [-35, 35], [-35, 30], [-35, 25], [-35, 20], [-35, 15], [-35, 10], [-35, 5], [-35, 0], [-35, -5], [-35, -10], [-35, -15], [-35, -20], [-35, -25], [-35, -30], [-35, -35],
        [5, 35], [5, 30], [5, 25], [5, 20], [5, 15], [5, 10], [5, 5], [5, 0], [5, -5], [5, -10], [5, -15], [5, -20], [5, -25], [5, -30], [5, -35],
        [10, 35], [10, 30], [10, 25], [10, 20], [10, 15], [10, 10], [10, 5], [10, 0], [10, -5], [10, -10], [10, -15], [10, -20], [10, -25], [10, -30], [10, -35],
        [15, 35], [15, 30], [15, 25], [15, 20], [15, 15], [15, 10], [15, 5], [15, 0], [15, -5], [15, -10], [15, -15], [15, -20], [15, -25], [15, -30], [15, -35],
        [20, 35], [20, 30], [20, 25], [20, 20], [20, 15], [20, 10], [20, 5], [20, 0], [20, -5], [20, -10], [20, -15], [20, -20], [20, -25], [20, -30], [20, -35],
        [25, 35], [25, 30], [25, 25], [25, 20], [25, 15], [25, 10], [25, 5], [25, 0], [25, -5], [25, -10], [25, -15], [25, -20], [25, -25], [25, -30], [25, -35],
        [30, 35], [30, 30], [30, 25], [30, 20], [30, 15], [30, 10], [30, 5], [30, 0], [30, -5], [30, -10], [30, -15], [30, -20], [30, -25], [30, -30], [30, -35],
        [35, 35], [35, 30], [35, 25], [35, 20], [35, 15], [35, 10], [35, 5], [35, 0], [35, -5], [35, -10], [35, -15], [35, -20], [35, -25], [35, -30], [35, -35],
    ];
    fieldPositions.forEach(pos => addTree(road.position.x + pos[0], road.position.z + pos[1]));
}, undefined, function (error) {
    console.error(error);
});

// Load car
const loader = new GLTFLoader();
loader.load('model/car/scene.gltf', function (gltf) {
    car = gltf.scene.children[0];

    wheels.push(
        car.getObjectByName('wheel_fl'),
        car.getObjectByName('wheel_fr'),
        car.getObjectByName('wheel_bl'),
        car.getObjectByName('wheel_br')
    );
    car.position.y = 0.01;
    scene.add(car);

    addHeadlights(car);
    addTailLights(car);
}, undefined, function (error) {
    console.error(error);
});

function addHeadlights(car) {
    const leftHeadlight = new THREE.PointLight(0xdff1f4, 2, 10, 2);
    leftHeadlight.position.set(-0.6, 0.85, 1.8);
    car.add(leftHeadlight);

    const rightHeadlight = new THREE.PointLight(0xdff1f4, 2, 10, 2);
    rightHeadlight.position.set(0.6, 0.85, 1.8);
    car.add(rightHeadlight);
}

function addTailLights(car) {
    const leftTailLight = new THREE.PointLight(0xff0000, 1, 20, 2);
    leftTailLight.position.set(-0.95, 0.8, -1.8);
    car.add(leftTailLight);

    const rightTailLight = new THREE.PointLight(0xff0000, 1, 20, 2);
    rightTailLight.position.set(0.95, 0.8, -1.8);
    car.add(rightTailLight);
}

function addTree(x, z) {
    const treeHeight = 2.5 + Math.random() * 1.5; // Random tree height
    const treeGeometry = new THREE.CylinderGeometry(0.5, 0.5, treeHeight, 8); // Adjusted tree size
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Brown color
    const tree = new THREE.Mesh(treeGeometry, treeMaterial);

    const leavesGeometry1 = new THREE.CylinderGeometry(0, 1.8, 3, 4, 1); // Adjusted leaves size
    const leavesMaterial1 = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green color
    const leaves1 = new THREE.Mesh(leavesGeometry1, leavesMaterial1);

    const leavesGeometry2 = new THREE.CylinderGeometry(0, 1.5, 2, 4, 1); // Adjusted leaves size
    const leavesMaterial2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green color
    const leaves2 = new THREE.Mesh(leavesGeometry2, leavesMaterial2);

    const leavesGeometry3 = new THREE.CylinderGeometry(0, 1, 1, 4, 1); // Adjusted leaves size
    const leavesMaterial3 = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green color
    const leaves3 = new THREE.Mesh(leavesGeometry3, leavesMaterial3);

    tree.position.set(x, treeHeight / 2, z);
    leaves1.position.set(0, treeHeight / 2, 0);
    leaves2.position.set(0, treeHeight / 2 + 0.5, 0);
    leaves3.position.set(0, treeHeight / 2 + 1, 0);

    scene.add(tree);
    tree.add(leaves1);
    tree.add(leaves2);
    tree.add(leaves3);
}

// Add lights to the scene
ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Create the moon object
const moonGeometry = new THREE.SphereGeometry(3, 32, 32);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, emissive: 0xd6e6ff });
moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(20, 50, 20); // Position the moon in the sky
scene.add(moon);

// Set the directional light position to match the moon
directionalLight.position.copy(moon.position);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight.target);

// Set the point light
pointLight = new THREE.PointLight(0xffff2e, 20, 40);
pointLight.position.set(0, 2, 2);
pointLight.castShadow = true;
scene.add(pointLight);

// Set the camera position
camera.position.set(-1, 2, 5);
camera.lookAt(0, 0, 0);

// Initialize mouse control variables
let isMousePressed = false;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousedown', () => {
    isMousePressed = true;
});

document.addEventListener('mouseup', () => {
    isMousePressed = false;
});

document.addEventListener('mousemove', (event) => {
    if (isMousePressed) {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        const movementScale = 1;

        const moveX = mouseX * movementScale;
        const moveY = -mouseY * movementScale;

        pointLight.position.x = moveX * 10;
        pointLight.position.z = moveY * 10;
    }
});

// Update the camera position based on the keyboard controls
window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            moveUp = true;
            break;
        case 'ArrowDown':
            moveDown = true;
            break;
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'ArrowRight':
            moveRight = true;
            break;
        case 'w':
            rotateUp = true;
            break;
        case 's':
            rotateDown = true;
            break;
        case 'a':
            rotateLeft = true;
            break;
        case 'd':
            rotateRight = true;
            break;
        case '-':
            zoomOut = true;
            break;
        case '+':
            zoomIn = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            moveUp = false;
            break;
        case 'ArrowDown':
            moveDown = false;
            break;
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'ArrowRight':
            moveRight = false;
            break;
        case 'w':
            rotateUp = false;
            break;
        case 's':
            rotateDown = false;
            break;
        case 'a':
            rotateLeft = false;
            break;
        case 'd':
            rotateRight = false;
            break;
        case '-':
            zoomOut = false;
            break;
        case '+':
            zoomIn = false;
            break;
    }
});

function updateCamera() {
    const moveSpeed = 0.2;
    const rotateSpeed = 0.02;
    const zoomSpeed = 0.2;
    const minZoomDistance = 4;
    const maxZoomDistance = 30;

    if (moveUp) {
        camera.position.z -= moveSpeed;
    }
    if (moveDown) {
        camera.position.z += moveSpeed;
    }
    if (moveLeft) {
        camera.position.x -= moveSpeed;
    }
    if (moveRight) {
        camera.position.x += moveSpeed;
    }
    if (rotateUp) {
        camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), -rotateSpeed);
        if (car) {
            camera.lookAt(car.position);
        } else {
            camera.lookAt(0, 0, 0);
        }
    }
    if (rotateDown) {
        camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotateSpeed);
        if (car) {
            camera.lookAt(car.position);
        } else {
            camera.lookAt(0, 0, 0);
        }
    }
    if (rotateLeft) {
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotateSpeed);
        if (car) {
            camera.lookAt(car.position);
        } else {
            camera.lookAt(0, 0, 0);
        }
    }
    if (rotateRight) {
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotateSpeed);
        if (car) {
            camera.lookAt(car.position);
        } else {
            camera.lookAt(0, 0, 0);
        }
    }

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    var currentDistance = 0;
    if (car) {
        currentDistance = camera.position.distanceTo(car.position);
    }

    if (zoomIn && currentDistance > minZoomDistance) {
        camera.position.addScaledVector(direction, zoomSpeed);
    }
    if (zoomOut && currentDistance < maxZoomDistance) {
        camera.position.addScaledVector(direction, -zoomSpeed);
    }
}

// Function to update the day-night cycle
function updateDayNightCycle() {
    const cycleTime = performance.now() * cycleSpeed;
    const angle = cycleTime % (2 * Math.PI);

    if (angle <= Math.PI) {
        moon.position.set(Math.cos(angle) * 50, Math.sin(angle) * 50, 0);
    } else {
        moon.position.set(-Math.cos(angle) * 50, -Math.sin(angle) * 50, 0);
    }

    directionalLight.position.copy(moon.position);

    if (angle > Math.PI) {
        isDayTime = false; // Night time
        directionalLight.intensity = 0.2;
        moon.material.color.set(0xd3d3d3);
        moon.material.emissive.set(0xd6e6ff);
        skyBoxShaderMaterial.uniforms.brightness.value = 0.3;
        skyBoxShaderMaterial.uniforms.timeOfDay.value = (angle - Math.PI) / Math.PI;

        car.children.forEach((child) => {
            if (child.isPointLight) {
                if (child.color.getHexString() === 'dff1f4') {
                    child.intensity = 2;
                }
                if (child.color.getHexString() === 'ff0000') {
                    child.intensity = 1;
                }
            }
        });
    } else {
        isDayTime = true; // Day time
        directionalLight.intensity = 2;
        moon.material.color.set(0xffdd44);
        moon.material.emissive.set(0xffdd44);
        skyBoxShaderMaterial.uniforms.brightness.value = 3.0;
        skyBoxShaderMaterial.uniforms.timeOfDay.value = angle / Math.PI;

        car.children.forEach((child) => {
            if (child.isPointLight) {
                child.intensity = 0;
            }
        });
    }
}

// Animate the scene
function animate() {
    requestAnimationFrame(animate);
    updateCamera();

    if (car) {
        const wheelSpeed = 0.1;
        wheels.forEach((wheel) => {
            wheel.rotation.x += wheelSpeed;
        });
    }

    skyBoxShaderMaterial.uniforms.brightness.value = isDayTime ? 3.0 : 0.8;
    updateDayNightCycle();

    renderer.render(scene, camera);
}

animate();