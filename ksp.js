define(['require', 'github:janesconference/KievII@0.6.0/kievII'], function(require, K2) {

    var imgResources = null;

    /* This gets returned to the host as soon as the plugin is loaded */
    var pluginConf = {
        name: "KSP",
        audioIn: 0,
        audioOut: 1,
        version: '0.0.2',
        hyaId: 'KSP',
        ui: {
            type: 'canvas',
            width: 428,
            height: 348
        }
    };

    /* This gets called when all the resources are loaded */
    var pluginFunction = function (args, resources) {

        var keyBlackImage = resources[0];
        var keyWhiteImage = resources[1];
        var keyBlackDownImage = resources[2];
        var keyWhiteDownImage = resources[3];
        var deckImage = resources[4];

        this.name = args.name;
        this.id = args.id;

        // The sound part
        this.audioDestination = args.audioDestinations[0];
        this.audioContext = args.audioContext;

        this.audioBuffer = null;

        this.ui = new K2.UI ({type: 'CANVAS2D', target: args.canvas}, {'breakOnFirstEvent': true});

        this.viewWidth = args.canvas.width;
        this.viewHeight = args.canvas.height;
        this.canvas = args.canvas;

        // Member methods
        this.drop = function (evt) {
            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.dataTransfer.files;
            var count = files.length;

            // Only call the handler if 1 or more files was dropped.
            if (count > 0) {
                this.handleFiles(files);
            }
        }.bind(this);

        this.handleFiles = function (files) {

            var file = files[0];
            if (!file) return;

            var reader = new FileReader();

            // set the file to save in the future
            this.loadedSample = file;

            // init the reader event handlers
            reader.onload = this.handleReaderLoad;
            // begin the read operation
            reader.readAsArrayBuffer(file);
        }.bind(this);

        this.playFinishedCallback = function () {
        };
        this.viewCurrentTime = function (time) {
        };

        this.successCallback = function (decoded) {

            this.audioBuffer = decoded;

            this.decoded_arrayL = decoded.getChannelData (0);

            // TODO check if the signal is mono or stero here
            //this.decoded_arrayR = decoded.getChannelData (1);

            var waveID = 'wavebox_L';

            if (!(this.ui.isElement(waveID))) {

                // Wavebox parameters
                var waveboxArgs = {
                    ID: waveID,
                    top: 35,
                    left: 10,
                    width: this.canvas.width - 10 * 2,
                    height: 148,
                    isListening: true,
                    waveColor: '#CC0000',
                    transparency: 0.8
                };

                waveboxArgs.onValueSet = function (slot, value, element) {
                    this.ui.refresh();
                }.bind(this);

                var waveBox_L = new K2.Wavebox(waveboxArgs);
                this.ui.addElement(waveBox_L, {zIndex: 2});
            }

            this.ui.setValue ({elementID: waveID, slot: "waveboxsignal", value: this.decoded_arrayL});

            this.ui.refresh();

        }.bind(this);

        this.errorCallback = function () {
            console.error ("Error!");
            // TODO signal the error to the user
        }.bind(this);

        this.handleReaderLoad = function (evt) {
            this.audioContext.decodeAudioData(evt.target.result, this.successCallback, this.errorCallback);
        }.bind(this);

        // Drop event
        this.noopHandler = function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
        };

        // Init event handlers
        this.canvas.addEventListener("dragenter", this.noopHandler, false);
        this.canvas.addEventListener("dragexit", this.noopHandler, false);
        this.canvas.addEventListener("dragover", this.noopHandler, false);
        this.canvas.addEventListener("drop", this.drop, false);

        // Background
        var bgArgs = new K2.Background({
            ID: 'background',
            image: deckImage,
            top: 0,
            left: 0
        });

        this.ui.addElement(bgArgs, {zIndex: 0});

        var noteOn = function (stPower, when) {
           
            if (!when) {when = 0;}

           this.bSrc = this.audioContext.createBufferSource();
           this.bSrc.connect (this.audioDestination);
           this.bSrc.buffer = this.audioBuffer;
           this.bSrc.playbackRate.value = Math.pow(1.0595, stPower);
           this.bSrc.loop = false;
           
           if (typeof this.bSrc.start !== 'function') {
                this.bSrc.noteOn(when);
           }
           else {
                this.bSrc.start(when);
           }
            
        }.bind(this);

        var noteOff = function () {
            
            if (this.stopOnLeavingKey) {
               if (typeof this.bSrc.stop !== 'function') {
                    this.bSrc.noteOff(0);
               }
               else {
                    this.bSrc.stop(0);
               }
            }
            
        }.bind(this);

        var keyCallback = function (slot, value, element) {

            var stIndex = 0;
            var stPower = 0;
            var whiteKeysSemitones = [0,2,4,5,7,9,11,12,14,16,17,19,21,23];
            var blackKeysSemitones = [1,3,6,8,10,13,15,18,20,22];

            if (element.indexOf("wk_") === 0) {
                stIndex = element.split("wk_")[1];
                stPower = whiteKeysSemitones[stIndex];
            }

            else  if (element.indexOf("bk_") === 0) {
                stIndex = element.split("bk_")[1];
                stPower = blackKeysSemitones[stIndex];
            }

            else {
                return;
            }

            if (this.audioBuffer !== null) {
                if (value === 1) {
                    noteOn (stPower, 0);
                }
                else if (value === 0) {
                    noteOff ();
                }
            }
            
            this.ui.refresh();

        }.bind(this);


        // White keys
        var whiteKeyArgs = {
            ID: "",
            left: 0,
            top: 0,
            mode: 'immediate',
            imagesArray : [keyWhiteImage, keyWhiteDownImage],
            onValueSet: keyCallback
        };

        for (i = 0; i < 14; i+=1) {
            whiteKeyArgs.top = 204;
            whiteKeyArgs.left = 4 + i * 30;
            whiteKeyArgs.ID = "wk_" + i;
            this.ui.addElement(new K2.Button(whiteKeyArgs), {zIndex: 1});
        }

        // Black keys
        var blackKeyArgs = {
                ID: "",
                left: 0,
                top: 0,
                mode: 'immediate',
                imagesArray : [keyBlackImage, keyBlackDownImage],
                onValueSet: keyCallback
            };

            var bkArray = [24, 54, 114, 144, 174, 234, 264, 324, 354, 384];

            for (var i = 0; i < bkArray.length; i+=1) {
                blackKeyArgs.top = 203;
                blackKeyArgs.left = bkArray[i];
                blackKeyArgs.ID = "bk_" + i;
                this.ui.addElement(new K2.Button(blackKeyArgs), {zIndex: 10});
            }
            this.ui.refresh();

        var onMIDIMessage = function (message, when) {
            if (message.type === 'noteon') {
                // translate message.pitch into the desidered pitch;
                var semiTones = message.pitch - 60;
                noteOn (semiTones, when);

                // TODO translate message.velocity. We must implement polyvoices here, and set a gain node for every one of the voices.
                // TODO See if the key is an a particular range, if it is, just set the correct (on) value in K2
                // call the noteOn method

            }
            if (message.type === 'noteoff') {
                // TODO See if the key is an a particular range, if it is, just set the correct (off) value in K2
            }
        };

        args.MIDIHandler.setMIDICallback (onMIDIMessage. bind (this));

        var saveState = function () {
            var obj = {
                bin: {
                    loadedSample: this.loadedSample
                }
            };
            return obj;
        }.bind(this);
        args.hostInterface.setSaveState (saveState);

        if (args.initialState && args.initialState.bin) {
            /* Load data */
            this.handleFiles ([args.initialState.bin.loadedSample]);
        }
        else {
            this.loadedSample = null;
        }

        // Initialization made it so far: plugin is ready.
        args.hostInterface.setInstanceStatus ('ready');
    };

    /* This function gets called by the host every time an instance of
       the plugin is requested [e.g: displayed on screen] */
    function initPlugin (initArgs) {

        var args = initArgs;

        var requireErr = function (err) {
            args.hostInterface.setInstanceStatus ('fatal', {description: 'Error initializing plugin'});
        }.bind(this);

        if (imgResources === null) {
            var resList = [ './assets/images/keyblack.png!image',
                            './assets/images/keywhite.png!image',
                            './assets/images/keyblack_down.png!image',
                            './assets/images/keywhite_down.png!image',
                            './assets/images/deck.png!image'
                            ];

            require (resList,
                        function () {
                            imgResources = arguments;
                            pluginFunction.call (this, args, arguments);
                        }.bind(this),
                        function (err) {
                            console.error ("require error");
                            requireErr (err);
                        }
                    );
        }

        else {
            pluginFunction.call (this, args, imgResources);
        }

    }

    return {
      initPlugin: initPlugin,
      pluginConf: pluginConf
    };
});
