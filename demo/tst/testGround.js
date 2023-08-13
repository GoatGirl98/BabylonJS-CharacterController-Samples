// unfinished and check extension settings of live server
// https://playground.babylonjs.com/#STWVDD#9
// https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes
// https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/sps_as_clone


var canvas = document.getElementById("renderCanvas");

var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
}

var timeStamp = 0.0;
var engine = null;
var scene = null;
var sceneToRender = null;

// engine and etc.

// WebGL2 - Parallel shader compilation
// var createDefaultEngine = function () { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false }); };
// WebGPU1
var createDefaultEngine = async function () {
    var engine = new BABYLON.WebGPUEngine(canvas);
    // todo : non compatibility mode for webGPU 
    // cannot use in async scene
    // engine.compatibilityMode = false;

    // todo : snapshot rendering optimization for webGPU
    // engine.snapshotRenderingMode = BABYLON.Constants.SNAPSHOTRENDERING_FAST (or BABYLON.Constants.SNAPSHOTRENDERING_STANDARD);
    // engine.snapshotRendering = true;
    await engine.initAsync();
    return engine;
}

var createAmbient = function (scene) {
    var ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0.0, 1.0, 0.0), scene);
    ambient.diffuse = new BABYLON.Color3(0.4, 0.4, 0.4);
    ambient.specular = new BABYLON.Color3(0.0, 0.0, 0.0);
    return ambient;
}

var createLight = function (scene) {
    var light = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1.0, -1.0, -1.0), scene);
    light.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
    light.specular = new BABYLON.Color3(1.0, 1.0, 1.0);
    return light;
}

var createSkyBox = function (fileDir, colorGradeDir, scene, size) {
    var skybox = BABYLON.Mesh.CreateBox("skybox", size, scene);
    skybox.material = new BABYLON.StandardMaterial("skyBox", scene);
    skybox.material.backFaceCulling = false;
    skybox.material.reflectionTexture = new BABYLON.CubeTexture(fileDir, scene);
    skybox.material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.material.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    skybox.material.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    skybox.material.cameraColorGradingTexture = new BABYLON.ColorGradingTexture(colorGradeDir, scene);
    skybox.material.cameraColorGradingTexture.level = 0.5;
    skybox.material.cameraColorGradingEnabled = true;
    skybox.freezeWorldMatrix();
    return skybox;
}

var createGround = function (scene, coordY, material, diffTextDir, diffUV, bumpTextDir, bumpUV, size, subDivisions, height, heightMapDir) {
    var ground = BABYLON.Mesh.CreateGroundFromHeightMap("ground", heightMapDir, size, size, subDivisions, 0, height, scene);
    ground.position.y = coordY;
    ground.material = new BABYLON.StandardMaterial(material, scene);
    ground.material.diffuseTexture = new BABYLON.Texture(diffTextDir, scene);
    ground.material.diffuseTexture.uScale = diffUV;
    ground.material.diffuseTexture.vScale = diffUV;
    ground.material.bumpTexture = new BABYLON.Texture(bumpTextDir, scene);
    ground.material.bumpTexture.uScale = bumpUV;
    ground.material.bumpTexture.vScale = bumpUV;
    ground.checkCollisions = true;
    ground.isPickable = true;
    ground.freezeWorldMatrix();
    return ground;
}

var currentControl, playerControl, demoNPCControl;
var allController = [];
var autoCommand = [];

var playerMesh, npcMesh;

function setPlayerPosition(x, y, z) {
    playerMesh.position = new BABYLON.Vector3(x, y, z);
    playerMesh.checkCollisions = true;
    playerMesh.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    playerMesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
}

var createPlayerCamera = function() {
    // rotate the camera behind the player
    // player.rotation.y = Math.PI / 4;
    // var alpha = -(Math.PI / 2 + player.rotation.y);
    var alpha = 0;
    var beta = Math.PI / 2.5;
    var target = new BABYLON.Vector3(playerMesh.position.x, playerMesh.position.y + 1.5, playerMesh.position.z);
    var camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", alpha, beta, 5, target, scene);

    // standard camera setting
    camera.wheelPrecision = 15;
    camera.checkCollisions = true;
    // make sure the keyboard keys controlling camera are different from those controlling player
    // here we will not use any keyboard keys to control camera
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.keysUp = [];
    camera.keysDown = [];
    // how close can the camera come to player
    camera.lowerRadiusLimit = 2;
    // how far can the camera go from the player
    camera.upperRadiusLimit = 200;

    camera.attachControl();

    return camera;
}

var createControl = function (mesh, camera, scene) {
    var control = new CharacterController(mesh, camera, scene);
    control.setFaceForward(true);
    control.setMode(0);
    control.setTurnSpeed(45);
    // below makes the controller point the camera at the player head which is approx
    // 1.5m above the player origin
    control.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));

    // if the camera comes close to the player we want to enter first person mode.
    control.setNoFirstPerson(false);
    // the height of steps which the player can climb
    control.setStepOffset(0.4);
    // the minimum and maximum slope the player can go up
    // between the two the player will start sliding down if it stops
    control.setSlopeLimit(30, 60);

    // tell controller
    // - which animation range should be used for which player animation
    // - rate at which to play that animation range
    // - wether the animation range should be looped
    //use this if name, rate or looping is different from default
    control.setIdleAnim("idle", 1, true);
    control.setTurnLeftAnim("turnLeft", 0.5, true);
    control.setTurnRightAnim("turnRight", 0.5, true);
    control.setWalkBackAnim("walkBack", 0.5, true);
    control.setIdleJumpAnim("idleJump", 0.5, false);
    control.setRunJumpAnim("runJump", 0.6, false);
    control.setFallAnim("fall", 2, false);
    control.setSlideBackAnim("slideBack", 1, false);

    let walkSound = new BABYLON.Sound(
        "walk",
        "./sounds/footstep_carpet_000.ogg",
        scene,
        () => {
            control.setSound(walkSound);
        },
        { loop: false }
    );

    var ua = window.navigator.userAgent;
    var isIE = /MSIE|Trident/.test(ua);
    if (isIE) {
        //IE specific code goes here
        control.setJumpKey("spacebar");
    }

    control.setCameraElasticity(true);
    control.makeObstructionInvisible(true);
    control.start();
    return control;
}

var createAutoNPCMesh = function(x, y, z) {
    var npc = npcMesh.clone();
    npc.skeleton = npcMesh.skeleton.clone();
    npc.position = new BABYLON.Vector3(x, y, z);
    npc.checkCollisions = true;
    npc.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    npc.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    return npc;
}




function loadPlayer(scene, engine, canvas, x, y, z) {
    BABYLON.SceneLoader.ImportMesh("", "player/", "Vincent-frontFacing.babylon", scene, function (meshes, particleSystems, skeletons) {
        playerMesh = meshes[0];
        
        playerMesh.skeleton = skeleton[0];

        playerMesh.skeleton.enableBlending(0.1);
        // if the skeleton does not have any animation ranges then set them as below
        // setAnimationRanges(skeleton);

        if (playerMesh.material.diffuseTexture != null) {
            playerMesh.material.backFaceCulling = true;
            playerMesh.material.ambientColor = new BABYLON.Color3(1, 1, 1);
        }

        
        
        

        

        var control = new CharacterController(playerMesh, camera, scene);
        control.setFaceForward(true);
        control.setMode(0);
        control.setTurnSpeed(45);
        // below makes the controller point the camera at the player head which is approx
        // 1.5m above the player origin
        control.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));

        // if the camera comes close to the player we want to enter first person mode.
        control.setNoFirstPerson(false);
        // the height of steps which the player can climb
        control.setStepOffset(0.4);
        // the minimum and maximum slope the player can go up
        // between the two the player will start sliding down if it stops
        control.setSlopeLimit(30, 60);

        // tell controller
        // - which animation range should be used for which player animation
        // - rate at which to play that animation range
        // - wether the animation range should be looped
        //use this if name, rate or looping is different from default
        control.setIdleAnim("idle", 1, true);
        control.setTurnLeftAnim("turnLeft", 0.5, true);
        control.setTurnRightAnim("turnRight", 0.5, true);
        control.setWalkBackAnim("walkBack", 0.5, true);
        control.setIdleJumpAnim("idleJump", 0.5, false);
        control.setRunJumpAnim("runJump", 0.6, false);
        control.setFallAnim("fall", 2, false);
        control.setSlideBackAnim("slideBack", 1, false);

        let walkSound = new BABYLON.Sound(
            "walk",
            "./sounds/footstep_carpet_000.ogg",
            scene,
            () => {
                control.setSound(walkSound);
            },
            { loop: false }
        );

        var ua = window.navigator.userAgent;
        var isIE = /MSIE|Trident/.test(ua);
        if (isIE) {
            //IE specific code goes here
            control.setJumpKey("spacebar");
        }

        control.setCameraElasticity(true);
        control.makeObstructionInvisible(true);
        control.start();

        allController.push(control);
        playerControl = control;
        autoCommand.push(0);

        // get camera and render
        engine.runRenderLoop(function () {
            scene.render();
        });

        // set cmd
        cmds = [playerControl.walk, playerControl.walkBack, playerControl.run, playerControl.jump, playerControl.turnLeft, playerControl.turnRight, playerControl.strafeLeft, playerControl.strafeRight];
        currentControl = playerControl;

        setControls();
        showControls();
        canvas.focus();
    });
}


function loadDemoNPC(scene, engine, canvas, x, y, z) {
    BABYLON.SceneLoader.ImportMesh("", "player/", "starterAvatars.babylon", scene, function (meshes, particleSystems, skeletons) {
        npcMesh = meshes[0];
        npcMesh.skeleton = skeletons[0];

        npcMesh.skeleton.enableBlending(0.1);
        //if the skeleton does not have any animation ranges then set them as below
        // setAnimationRanges(skeleton);

        if (npcMesh.material.diffuseTexture != null) {
            npcMesh.material.backFaceCulling = true;
            npcMesh.material.ambientColor = new BABYLON.Color3(1, 1, 1);
        }


        npcMesh.position = new BABYLON.Vector3(x, y, z);
        npcMesh.checkCollisions = true;
        npcMesh.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        npcMesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);


        var control = new CharacterController(npcMesh, null, scene);
        control.setFaceForward(false);
        control.setMode(0);
        control.setTurnSpeed(45);

        //the height of steps which the player can climb
        control.setStepOffset(0.4);
        //the minimum and maximum slope the player can go up
        //between the two the player will start sliding down if it stops
        control.setSlopeLimit(30, 60);

        //tell controller
        // - which animation range should be used for which player animation
        // - rate at which to play that animation range
        // - wether the animation range should be looped
        //use this if name, rate or looping is different from default
        control.setIdleAnim("idle", 1, true);
        control.setTurnLeftAnim("turnLeft", 0.5, true);
        control.setTurnRightAnim("turnRight", 0.5, true);
        control.setWalkBackAnim("walkBack", 0.5, true);
        control.setIdleJumpAnim("idleJump", 0.5, false);
        control.setRunJumpAnim("runJump", 0.6, false);
        control.setFallAnim("fall", 2, false);
        control.setSlideBackAnim("slideBack", 1, false);

        let walkSound = new BABYLON.Sound(
            "walk",
            "./sounds/footstep_carpet_000.ogg",
            scene,
            () => {
                control.setSound(walkSound);
            },
            { loop: false }
        );

        var ua = window.navigator.userAgent;
        var isIE = /MSIE|Trident/.test(ua);
        if (isIE) {
            //IE specific code goes here
            control.setJumpKey("spacebar");
        }

        control.enableKeyBoard(false);
        control.start();
        allController.push(control);
        
        demoNPCControl = control;
        autoCommand.push(0);
    });
}

function loadAutoNPC(scene, engine, canvas, x, y, z, autoMove) {
    BABYLON.SceneLoader.ImportMesh("", "player/", "starterAvatars.babylon", scene, function (meshes, particleSystems, skeletons) {
        npcMesh = meshes[0];
        npcMesh.skeleton = skeletons[0];

        npcMesh.skeleton.enableBlending(0.1);
        //if the skeleton does not have any animation ranges then set them as below
        // setAnimationRanges(skeleton);

        if (npcMesh.material.diffuseTexture != null) {
            npcMesh.material.backFaceCulling = true;
            npcMesh.material.ambientColor = new BABYLON.Color3(1, 1, 1);
        }


        npcMesh.position = new BABYLON.Vector3(x, y, z);
        npcMesh.checkCollisions = true;
        npcMesh.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        npcMesh.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);


        var control = new CharacterController(npcMesh, null, scene);
        control.setFaceForward(false);
        control.setMode(0);
        control.setTurnSpeed(45);

        //the height of steps which the player can climb
        control.setStepOffset(0.4);
        //the minimum and maximum slope the player can go up
        //between the two the player will start sliding down if it stops
        control.setSlopeLimit(30, 60);

        //tell controller
        // - which animation range should be used for which player animation
        // - rate at which to play that animation range
        // - wether the animation range should be looped
        //use this if name, rate or looping is different from default
        control.setIdleAnim("idle", 1, true);
        control.setTurnLeftAnim("turnLeft", 0.5, true);
        control.setTurnRightAnim("turnRight", 0.5, true);
        control.setWalkBackAnim("walkBack", 0.5, true);
        control.setIdleJumpAnim("idleJump", 0.5, false);
        control.setRunJumpAnim("runJump", 0.6, false);
        control.setFallAnim("fall", 2, false);
        control.setSlideBackAnim("slideBack", 1, false);

        let walkSound = new BABYLON.Sound(
            "walk",
            "./sounds/footstep_carpet_000.ogg",
            scene,
            () => {
                control.setSound(walkSound);
            },
            { loop: false }
        );

        var ua = window.navigator.userAgent;
        var isIE = /MSIE|Trident/.test(ua);
        if (isIE) {
            //IE specific code goes here
            control.setJumpKey("spacebar");
        }

        control.enableKeyBoard(false);
        control.start();
        allController.push(control);
        
        demoNPCControl = control;
        autoCommand.push(0);
    });
}



function showControls() {
    document.getElementById("controls").style.visibility = "visible";
}


var w,
    wb,
    wbf,
    r,
    j,
    tl,
    tlf,
    tr,
    trf,
    sl,
    slf,
    sr,
    srf = false;

function toggleClass(e) {
    e.target.classList.toggle("w3-pale-red");
    e.target.classList.toggle("w3-pale-green");
    canvas.focus();
}

function setUIValues() {

    document.getElementById("tp").checked = currentControl.getMode() == 0 ? true : false;
    document.getElementById("td").checked = currentControl.getMode() == 1 ? true : false;
    document.getElementById("toff").checked = currentControl.isTurningOff();
    document.getElementById("kb").checked = currentControl.isKeyBoardEnabled();

    //for npc third person mode is always disabled.
    document.getElementById("tp").disabled = (currentControl == demoNPCControl);
    document.getElementById("toff").disabled = (currentControl == demoNPCControl);
}




function setControls() {
    const x = document.getElementsByTagName("button");

    //init style
    for (i = 0; i < x.length; i++) {
        x[i].className = "w3-btn w3-border w3-round w3-pale-red";
    }
    //init values
    setUIValues();


    //click handlers
    document.getElementById("pl").onclick = function (e) {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock || false;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
        canvas.focus();
    };

    //click handlers
    document.getElementById("pc").onclick = function (e) {
        currentControl = playerControl;
        setUIValues();
        canvas.focus();
    };

    document.getElementById("npc").onclick = function (e) {
        currentControl = demoNPCControl;
        setUIValues();
        canvas.focus();
    };

    document.getElementById("w").onclick = function (e) {
        currentControl.walk((w = !w));
        toggleClass(e);
    };
    document.getElementById("wb").onclick = function (e) {
        currentControl.walkBack((wb = !wb));
        toggleClass(e);
    };
    document.getElementById("wbf").onclick = function (e) {
        currentControl.walkBackFast((wbf = !wbf));
        toggleClass(e);
    };
    document.getElementById("r").onclick = function (e) {
        currentControl.run((r = !r));
        toggleClass(e);
    };
    document.getElementById("j").onclick = function (e) {
        currentControl.jump();
        canvas.focus();
    };
    document.getElementById("tl").onclick = function (e) {
        currentControl.turnLeft((tl = !tl));
        toggleClass(e);
    };
    document.getElementById("tlf").onclick = function (e) {
        currentControl.turnLeftFast((tlf = !tlf));
        toggleClass(e);
    };
    document.getElementById("tr").onclick = function (e) {
        currentControl.turnRight((tr = !tr));
        toggleClass(e);
    };
    document.getElementById("trf").onclick = function (e) {
        currentControl.turnRightFast((trf = !trf));
        toggleClass(e);
    };
    document.getElementById("sl").onclick = function (e) {
        currentControl.strafeLeft((sl = !sl));
        toggleClass(e);
    };
    document.getElementById("slf").onclick = function (e) {
        currentControl.strafeLeftFast((slf = !slf));
        toggleClass(e);
    };
    document.getElementById("sr").onclick = function (e) {
        currentControl.strafeRight((sr = !sr));
        toggleClass(e);
    };
    document.getElementById("srf").onclick = function (e) {
        currentControl.strafeRightFast((srf = !srf));
        toggleClass(e);
    };

    document.getElementById("tp").onclick = function (e) {
        currentControl.setMode(0);
        canvas.focus();
    };
    document.getElementById("td").onclick = function (e) {
        currentControl.setMode(1);
        canvas.focus();
    };
    document.getElementById("toff").onclick = function (e) {
        currentControl.setTurningOff(e.target.checked);
        canvas.focus();
    };
    document.getElementById("kb").onclick = function (e) {
        currentControl.enableKeyBoard(e.target.checked);
        canvas.focus();
    };
}




var createScene = async function () {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.75, 0.75, 0.75);
    scene.ambientColor = new BABYLON.Color3(1, 1, 1);

    // debugger
    scene.debugLayer.show({ showExplorer: true, embedMode: true });


    // engine & scene instrumentation
    var engineInstrumentation = new BABYLON.EngineInstrumentation(engine);
    engineInstrumentation.captureGPUFrameTime = true;
    engineInstrumentation.captureShaderCompilationTime = true;
    var sceneInstrumentation = new BABYLON.SceneInstrumentation(scene);
    sceneInstrumentation.captureFrameTime = true;



    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1;


    var ambient = createAmbient(scene);
    var sun = createLight(scene);

    var size = 128;
    var height = 0;

    var skybox = createSkyBox("./textures/skyBoxSnowMountain/skybox4", "./textures/LateSunset.3dl", scene, size);

    var ground = createGround(scene, -15, "terrain1", "./textures/ice+and+snow+ground-4096x4096.png", 50.0,
        "./textures/bumpTextures/bump_rock.jpg", 10.0, size, 250, height, "./ground/ground_heightMap.png");

    // load player and npc Mesh

    const playerMeshResult = await BABYLON.SceneLoader.ImportMeshAsync("", "player/", "Vincent-frontFacing.babylon", scene);
    
    playerMesh = playerMeshResult.meshes[0];
    playerMesh.skeleton = playerMeshResult.skeletons[0];
    playerMesh.skeleton.enableBlending(0.1);

    if (playerMesh.material.diffuseTexture != null) {
        playerMesh.material.backFaceCulling = true;
        playerMesh.material.ambientColor = new BABYLON.Color3(1, 1, 1);
    }

    const npcMeshResult = await BABYLON.SceneLoader.ImportMeshAsync("", "player/", "starterAvatars.babylon", scene);
    npcMesh = npcMeshResult.meshes[0];
    npcMesh.skeleton = npcMeshResult.skeletons[0];
    npcMesh.skeleton.enableBlending(0.1);

    if (npcMesh.material.diffuseTexture != null) {
        npcMesh.material.backFaceCulling = true;
        npcMesh.material.ambientColor = new BABYLON.Color3(1, 1, 1);
    }



    // only for debug while coding
    /*
    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, BABYLON.Vector3.Zero(), scene);
    camera.setPosition(new BABYLON.Vector3(-15, 3, 0));
    camera.attachControl(canvas, true);
    */
    loadPlayer(scene, engine, canvas, 0, height + 30, 12); // notice that y is height
    loadDemoNPC(scene, engine, canvas, 0, height + 30, 17);
    loadNPC(scene, engine, canvas, 0, height + 30, 7, 2);
    loadNPC(scene, engine, canvas, 5, height + 30, 9, 3);
    loadNPC(scene, engine, canvas, 15, height + 30, 16, 4);
    loadNPC(scene, engine, canvas, 20, height + 30, 20, 5);
    loadNPC(scene, engine, canvas, 30, height + 30, 25, 6);
    loadNPC(scene, engine, canvas, 5, height + 30, 25, 7);
    loadNPC(scene, engine, canvas, 0, height + 30, 25, 8);
    //allController[2].run(true);
    //allController[2].turnRightFast(true);


    scene.registerBeforeRender(function () {
        // light
        skybox.material.cameraColorGradingTexture.level = Math.sin(timeStamp / 120.0) * 0.5 + 0.5;
        timeStamp += 1.0;
        /*
        if (timeStamp == 1000.0) {   
            if (!allController[2].anyMovement()) {
                allController[2].run(true);
                allController[2].turnRightFast(true);
            }
            if (!allController[3].anyMovement()) {
                allController[3].run(true);
                allController[3].turnLeftFast(true);
            }
            if (!allController[4].anyMovement()) {
                allController[4].walk(true);
                allController[4].turnRightFast(true);
            }
            if (!allController[5].anyMovement()) {
                allController[5].walk(true);
                allController[5].turnLeftFast(true);
            }
            if (!allController[6].anyMovement()) {
                allController[6].turnRightFast(true);
            }
            if (!allController[7].anyMovement()) {
                allController[7].turnLeftFast(true);
            }
        }
        */
        if (timeStamp >= 1000.0) {
            if (!allController[8].anyMovement()) {
                allController[8].jump();
            }
        }

        // debugger information on HTML
        document.getElementById("fps").innerHTML = "FPS: " + engine.getFps().toFixed() + " fps";
        document.getElementById("absolute-fps").innerHTML = "absolute FPS: " + (1000.0 / sceneInstrumentation.frameTimeCounter.lastSecAverage).toFixed() + " fps";
        document.getElementById("shader-count").innerHTML = "compiler shaders count : " + engineInstrumentation.shaderCompilationTimeCounter.count;
        document.getElementById("meshes").innerHTML = "Meshes: " + scene.meshes.length;
        document.getElementById("total-character").innerHTML = "Character : " + allController.length;
        document.getElementById("any-movement").innerHTML = "Player any movement : " + currentControl.anyMovement();
    });

    return scene;
}


window.initFunction = async function () {
    var asyncEngineCreation = async function () {
        try {
            return createDefaultEngine();
        } catch (e) {
            console.log("the available createEngine function failed. Creating the default engine instead");
            return createDefaultEngine();
        }
    }

    window.engine = await asyncEngineCreation();
    if (!engine) throw 'engine should not be null.';
    startRenderLoop(engine, canvas);
    window.scene = createScene();
};
initFunction().then(() => {
    sceneToRender = scene
});

// Resize
window.addEventListener("resize", function () {
    engine.resize();
});
