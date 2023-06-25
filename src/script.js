import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 ******************************
 ****** Three.js Initial ******
 ******************************
 */

/**
 * Init
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(5, 5, 5);
scene.add(camera);

/**
 * Addition
 */
// Controls
const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;

// Lights
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
// scene.add(ambientLight);

// MODELVIEWER
let pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
).texture;

// Axes
const axes = new THREE.AxesHelper(10);
scene.add(axes);

/**
 ******************************
 ************ Main ************
 ******************************
 */

/**
 * Definitions
 */

// Main Model
let model_1, model_2, model_3;

/**
 * ~~~~~~~~~~~~~~~~~~~~ Below is for Bloom ~~~~~~~~~~~~~~~~~~~~
 */
const BLOOM_SCENE = 1; // Need help: how can I add more Bloom Layer???? :)

const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const params = {  // Need help for each parameter.. :)
    threshold: 0,
    strength: 2,
    radius: 0.3,
    exposure: 0.5,
};

const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
const materials = {};

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(  // Need help for each parameter.. :)
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
);
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
            varying vec2 vUv;

            void main() {

                vUv = uv;

                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

            }
        `,
        fragmentShader: `
            uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;

            varying vec2 vUv;

            void main() {

                gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

            }
        `,
        defines: {},
    }),
    "baseTexture"
);
mixPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(mixPass);

/**
 * ~~~~~~~~~~~~~~~~~~~~ Above is for Bloom ~~~~~~~~~~~~~~~~~~~~
 */

/**
 * Models
 */
// Draco
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

// GLTF Loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Load main model
gltfLoader.load("/models/1.glb", (gltf) => {
    model_1 = gltf.scene;
    model_1.traverse((child) => {
        if (child.name == "Sphere_3") {
            console.log(3);
            child.layers.toggle(BLOOM_SCENE); // ~~~~~~~~~~~~~~~~~~~~ This is for Bloom ~~~~~~~~~~~~~~~~~~~~
        }
    });
    scene.add(model_1);
});
gltfLoader.load("/models/2.glb", (gltf) => {
    model_2 = gltf.scene;
    model_2.position.y = 1;
    model_2.traverse((child) => {
        if (child.isMesh) { // bloom is only for mesh !!!
            console.log(3);
            child.layers.toggle(BLOOM_SCENE);
        }
    });
    scene.add(model_2);
});
gltfLoader.load("/models/3.glb", (gltf) => {
    model_3 = gltf.scene;
    model_3.position.y = -1;
    scene.add(model_3);
});




/**
 * ~~~~~~~~~~~~~~~~~~~~ Functions for Bloom ~~~~~~~~~~~~~~~~~~~~
 */
function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
    }
}

/**
 * Action
 */
// Auto Resize
window.addEventListener("resize", () => {
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Animate
 */
const animate = () => {
    // Update controls
    orbitControls.update();

    // Bloom
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);

    finalComposer.render();

    // Do not use renderer.render()!!!

    // Call animate again on the next frame
    window.requestAnimationFrame(animate);
};

animate();
