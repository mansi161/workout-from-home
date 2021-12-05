/**
 * @file This calss is the central cordinator between other supportive classes that collectively guide and show progress of the user's workout.
 * @author Dhruvin Hasmukh Makwana,  Mannat Jyot Singh
 */
/** Class representing ARWorkout engine. */
class ARWorkoutEngine {
    static instance
    /**
     * Create an instance of ARworkoutEngine.
     * @param {HTMLElement} userVideo - HTML video element of user's video
     * @param {MediaStream} userStream - Object representing users video stream
     * @param {Canvas} userCanvas - Canvas on which user's video stream is to be drawn
     * @param {Canvas} drawingCanvas - Canvas which is tp be used for animating objects on screen.
     * @param {String} workoutType - Intital type of workout the user will be performing.
     */
    constructor({
        userVideo = "",
        userStream = "",
        userCanvas = "",
        drawingCanvas = "",
        workoutType = ""
    } = {}) {
        this.userVideo = userVideo
        this.userCanvas = userCanvas
        this.userStream = userStream
        this.userCanvas.height = this.userVideo.videoHeight
        this.userCanvas.width = this.userVideo.videoWidth
        this.userCanvasContext = this.userCanvas.getContext("2d");
        this.userCanvasContext.translate(this.userCanvas.width, 0);
        this.userCanvasContext.scale(-1, 1);

        this.drawingCanvas = drawingCanvas
        this.drawingCanvas.height = this.userVideo.videoHeight
        this.drawingCanvas.width = this.userVideo.videoWidth

        this.initializePoseNet()
        this.initializeCamera()
        this.POSENET_LOADED = false
        this.sketcher = new Sketcher(this.userCanvas)
        ARWorkoutEngine.setInstance(this)
        this.NOSE = 'nose'
        window.LEFT_SHOULDER = "left_shoulder"
        window.RIGHT_SHOULDER = "right_shoulder"
        window.LEFT_WRIST = "left_wrist"
        window.RIGHT_WRIST = "right_wrist"
        window.LEFT_HIP = "left_hip"
        window.RIGHT_HIP = "right_hip"
        window.LEFT_KNEE="left_knee"
        window.RIGHT_KNEE="right_knee"
        this.poseMapper = new PoseMapper(this.drawingCanvas)
        this.poseMapper.onWorkoutEnd(this.workoutEndHandler)
        this.poseMapper.onRepsUpdate(this.repsUpdateHandler)
        this.workoutType=workoutType

    }
    /**
     * Asynchronous function that performs the initilization of Posenet tensorflow model 
     * and emits 'model-loaded' event once initialization is complete.
     */
    async initializePoseNet() {
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        $('body').trigger('model-loaded')
        this.POSENET_LOADED = true
    }
    
    /**
     * Function responsible for using user's stram from HTML video element and extracting frames via camera_utils library.
     */
    async initializeCamera() {
        const camera = new Camera(this.userVideo, {
            onFrame: async () => {
                this.drawUserStream();
                if (this.POSENET_LOADED) {
                    this.performPredictions()
                    this.poseMapper.startWorkout(this.workoutType)
                }
            },
            width: 1280,
            height: 720,
        });
        camera.start(this.userStream);

    }

    /**
     * Perfrom analysis of  user's current frame along with restructuring of the detected keypoints.
     * Save detected keypoints in to  variable restructuredPoseData.
     *  
     */
    async performPredictions() {
        const poses = await this.detector.estimatePoses(this.userVideo);
        // console.log(poses)
        // this.sketcher.drawPredictions(poses)
        this.restructuredPoseData = {}
        if (poses.length == 0) {
            return
        }
        for (let index = 0; index < poses[0].keypoints.length; index++) {
            const element = poses[0].keypoints[index];
            this.restructuredPoseData[element.name] = {
                x: element.x,
                y: element.y,
                score: element.score
            }
        }
        this.restructuredPoseData[window.LEFT_HIP].x *= 1.10
        this.restructuredPoseData[window.RIGHT_HIP].x *= 0.90
        // console.log(this.restructuredPoseData)
        this.poseMapper.updateKeyPoints(this.restructuredPoseData)

    }
    /**
     * Handler function which will be called by PoseMapper class whenever user workout is complete and redirects the user to the workout complete screen.
     * This function fires AJAX request to end workout session in DB.
     *  
     */
    workoutEndHandler(data) {
        console.log(data)
        alert("Workout complete with accuracy :" + data.accuracy)
        $.ajax({
            url: '/exercise/endSession',
            type: 'POST',
            data: {
                sessionID: window.sessionID,
                accuracy: data.accuracy
            },
            success: function (data) {
                // window.sessionID = data.sessionID
                console.log(data);
                window.location.href='/exercise/complete'
            }

        });
    }
    /**
     * Log each workout activity performed by user in the database.
     * 
     */
    repsUpdateHandler(data) {

        $.ajax({
            url: '/exercise/updateSession',
            type: 'POST',
            data: {
                sessionID: window.sessionID,
                reps: data.reps
            },
            success: function (data) {
                // window.sessionID = data.sessionID
                console.log(data);
            }

        });
    }
    /**
     * Draw user's video stream on the usercanvas provided in the constructor.
     */
    drawUserStream() {
        this.userCanvasContext.drawImage(this.userVideo, 0, 0, this.userVideo.videoWidth, this.userVideo.videoHeight)
    }
    /**
     * Setter method to update user's canvas
     * @param {Canvas} cv - Canvas element
     */
    updateCanvas(cv) {
        this.userCanvas = cv
    }
    /**
     * Setter method to update user's video element
     * @param {HTMLVideoElement} vidoe - HTMLvideo element
     */
    updateVideo(video) {
        this.userVideo = video
    }
    /**
     * Setter method to update user's stream object
     * @param {Canvas} cv - New stream object
     */
    updateStream(stream) {
        this.userStream = stream
    }
    /**
     * Static method to set global instance of the class.
     * @param {ARWorkoutEngine} instance - instance of ARWorkoutEngine
     */
    static setInstance(instance) {
        this.instance = instance
    }
    /**
     * Static method to get global instance of the class.
     * @return {ARWorkoutEngine} instance - instance of ARWorkoutEngine
     */
    static getInstance() {
        if (!this.instance) {
            throw new Error('Cannot get ARWorkoutEngine instance without building it.')
        } else {
            return this.instance

        }
    }
}
