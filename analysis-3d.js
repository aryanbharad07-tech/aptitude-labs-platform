/* analysis-3d.js */

document.addEventListener('DOMContentLoaded', initOcean);

function initOcean() {
    const container = document.getElementById('bg-canvas');
    if (!container) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a14, 0.002); // Dark fog

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(30, 30, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 2. Create Ocean Geometry (High Segment Plane)
    const geometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
    geometry.rotateX(-Math.PI / 2);

    // 3. Create "Dark Water" Material
    const material = new THREE.MeshPhongMaterial({
        color: 0x001e36,       // Deep Blue/Black Base
        emissive: 0x000000,
        specular: 0x111111,    // Subtle reflection
        shininess: 30,
        flatShading: true,
    });

    const ocean = new THREE.Mesh(geometry, material);
    scene.add(ocean);

    // 4. Lights (Moonlight)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft base
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 0.8); // Moonlight
    light.position.set(0, 50, 50);
    scene.add(light);

    // 5. Animation Variables
    const positions = geometry.attributes.position;
    const count = positions.count;
    const initialZ = [];

    // Store initial positions
    for (let i = 0; i < count; i++) {
        initialZ.push(positions.getY(i));
    }

    // 6. Animation Loop
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Animate Waves using Math.sin/cos
        for (let i = 0; i < count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i); // In 3D space, Z is depth (plane Y after rotation)

            // The Wave Formula: Combines big swells and small ripples
            const wave1 = Math.sin(x * 0.02 + time) * 10;
            const wave2 = Math.cos(z * 0.01 + time) * 10;
            const wave3 = Math.sin((x + z) * 0.05 + time) * 5;

            // Apply height
            positions.setY(i, wave1 + wave2 + wave3);
        }

        positions.needsUpdate = true;
        ocean.geometry.computeVertexNormals(); // Updates lighting to match waves

        // Slow Camera Drift
        camera.position.x = Math.sin(time * 0.1) * 20;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}