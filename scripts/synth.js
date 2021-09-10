let Synth = module.exports = (function(){
	let exports = {};

	let createNoteTable = () => {
		let noteFreq = [];
		for (let i = 0; i < 9; i++) {
			noteFreq[i] = [];
		}

		noteFreq[0]["C"] = 16.35;
		noteFreq[0]["C#"] = 17.32;
		noteFreq[0]["D"] = 18.35;
		noteFreq[0]["D#"] = 19.45;
		noteFreq[0]["E"] = 20.60;
		noteFreq[0]["F"] = 21.83;
		noteFreq[0]["F#"] = 23.12;
		noteFreq[0]["G"] = 24.50;
		noteFreq[0]["G#"] = 25.96;
		noteFreq[0]["A"] = 27.500000000000000;
		noteFreq[0]["A#"] = 29.135235094880619;
		noteFreq[0]["B"] = 30.867706328507756;

		noteFreq[1]["C"] = 32.703195662574829;
		noteFreq[1]["C#"] = 34.647828872109012;
		noteFreq[1]["D"] = 36.708095989675945;
		noteFreq[1]["D#"] = 38.890872965260113;
		noteFreq[1]["E"] = 41.203444614108741;
		noteFreq[1]["F"] = 43.653528929125485;
		noteFreq[1]["F#"] = 46.249302838954299;
		noteFreq[1]["G"] = 48.999429497718661;
		noteFreq[1]["G#"] = 51.913087197493142;
		noteFreq[1]["A"] = 55.000000000000000;
		noteFreq[1]["A#"] = 58.270470189761239;
		noteFreq[1]["B"] = 61.735412657015513;

		noteFreq[2]["C"] = 65.406391325149658;
		noteFreq[2]["C#"] = 69.295657744218024;
		noteFreq[2]["D"] = 73.416191979351890;
		noteFreq[2]["D#"] = 77.781745930520227;
		noteFreq[2]["E"] = 82.406889228217482;
		noteFreq[2]["F"] = 87.307057858250971;
		noteFreq[2]["F#"] = 92.498605677908599;
		noteFreq[2]["G"] = 97.998858995437323;
		noteFreq[2]["G#"] = 103.826174394986284;
		noteFreq[2]["A"] = 110.000000000000000;
		noteFreq[2]["A#"] = 116.540940379522479;
		noteFreq[2]["B"] = 123.470825314031027;

		noteFreq[3]["C"] = 130.812782650299317;
		noteFreq[3]["C#"] = 138.591315488436048;
		noteFreq[3]["D"] = 146.832383958703780;
		noteFreq[3]["D#"] = 155.563491861040455;
		noteFreq[3]["E"] = 164.813778456434964;
		noteFreq[3]["F"] = 174.614115716501942;
		noteFreq[3]["F#"] = 184.997211355817199;
		noteFreq[3]["G"] = 195.997717990874647;
		noteFreq[3]["G#"] = 207.652348789972569;
		noteFreq[3]["A"] = 220.000000000000000;
		noteFreq[3]["A#"] = 233.081880759044958;
		noteFreq[3]["B"] = 246.941650628062055;

		noteFreq[4]["C"] = 261.625565300598634;
		noteFreq[4]["C#"] = 277.182630976872096;
		noteFreq[4]["D"] = 293.664767917407560;
		noteFreq[4]["D#"] = 311.126983722080910;
		noteFreq[4]["E"] = 329.627556912869929;
		noteFreq[4]["F"] = 349.228231433003884;
		noteFreq[4]["F#"] = 369.994422711634398;
		noteFreq[4]["G"] = 391.995435981749294;
		noteFreq[4]["G#"] = 415.304697579945138;
		noteFreq[4]["A"] = 440.000000000000000;
		noteFreq[4]["A#"] = 466.163761518089916;
		noteFreq[4]["B"] = 493.883301256124111;

		noteFreq[5]["C"] = 523.251130601197269;
		noteFreq[5]["C#"] = 554.365261953744192;
		noteFreq[5]["D"] = 587.329535834815120;
		noteFreq[5]["D#"] = 622.253967444161821;
		noteFreq[5]["E"] = 659.255113825739859;
		noteFreq[5]["F"] = 698.456462866007768;
		noteFreq[5]["F#"] = 739.988845423268797;
		noteFreq[5]["G"] = 783.990871963498588;
		noteFreq[5]["G#"] = 830.609395159890277;
		noteFreq[5]["A"] = 880.000000000000000;
		noteFreq[5]["A#"] = 932.327523036179832;
		noteFreq[5]["B"] = 987.766602512248223;

		noteFreq[6]["C"] = 1046.502261202394538;
		noteFreq[6]["C#"] = 1108.730523907488384;
		noteFreq[6]["D"] = 1174.659071669630241;
		noteFreq[6]["D#"] = 1244.507934888323642;
		noteFreq[6]["E"] = 1318.510227651479718;
		noteFreq[6]["F"] = 1396.912925732015537;
		noteFreq[6]["F#"] = 1479.977690846537595;
		noteFreq[6]["G"] = 1567.981743926997176;
		noteFreq[6]["G#"] = 1661.218790319780554;
		noteFreq[6]["A"] = 1760.000000000000000;
		noteFreq[6]["A#"] = 1864.655046072359665;
		noteFreq[6]["B"] = 1975.533205024496447;

		noteFreq[7]["C"] = 2093.004522404789077;
		noteFreq[7]["C#"] = 2217.461047814976769;
		noteFreq[7]["D"] = 2349.318143339260482;
		noteFreq[7]["D#"] = 2489.015869776647285;
		noteFreq[7]["E"] = 2637.020455302959437;
		noteFreq[7]["F"] = 2793.825851464031075;
		noteFreq[7]["F#"] = 2959.955381693075191;
		noteFreq[7]["G"] = 3135.963487853994352;
		noteFreq[7]["G#"] = 3322.437580639561108;
		noteFreq[7]["A"] = 3520.000000000000000;
		noteFreq[7]["A#"] = 3729.310092144719331;
		noteFreq[7]["B"] = 3951.066410048992894;

		noteFreq[8]["C"] = 4186.009044809578154;
		noteFreq[8]["C#"] = 4434.92;
		noteFreq[8]["D"] = 4698.63;
		noteFreq[8]["D#"] = 4978.03;
		noteFreq[8]["E"] = 5274.04;
		noteFreq[8]["F"] = 5587.65;
		noteFreq[8]["F#"] = 5919.91;
		noteFreq[8]["G"] = 6271.93;
		noteFreq[8]["G#"] = 6644.88;
		noteFreq[8]["A"] = 7040.00;
		noteFreq[8]["A#"] = 7458.62;
		noteFreq[8]["B"] = 7902.13;

		return noteFreq;
	};

	let stopTime = 0.3; // Poping noises if you stop immediately after envelope
	let lookAhead = 0.01; // Q: Is this needed when rendering to offline ctx?
	// If you don't schedule changes at some point ahead, then you get noticable popping noises 
	// https://github.com/Tonejs/Tone.js/wiki/Performance
	
	exports.noteArray = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
	exports.waveforms = [ "sine", "square", "sawtooth", "triangle" ];
	exports.noteTable = createNoteTable();

	let createAttackNode = function(ctx, t, a) {
		let env = ctx.createGain();
		env.gain.cancelScheduledValues(ctx.currentTime);
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(1, t + a);
		return env;
	};
	
	let createAttackDecayNode = function(ctx, t, a, d, sustain) {
		let env = createAttackNode(ctx, t, a);
		env.gain.linearRampToValueAtTime(sustain, t + a + d);
		return env;
	};
	
	let createADSRNode = function(ctx, t, a, d, s, r, sustain) {
		let env = createAttackDecayNode(ctx, t, a, d, sustain);
		env.gain.setValueAtTime(sustain, t + a + d + s);
		env.gain.linearRampToValueAtTime(0, t + a + d + s + r);
		return env;
	};

	let playNote = (ctx, freq, waveform, envelope, delay) => {
		if (delay === undefined) {
			delay = 0;
		}
		let t = ctx.currentTime + delay + lookAhead;
		let osc = ctx.createOscillator();
		osc.type = waveform; // TODO: Support custom waveform via osc.setPeriodicWave (can we recreate the in built types as wavetables for ease?)
		osc.frequency.value = freq;

		/* Sample envelope: { a: 0.1, d: 0.2, s: 0.4, r: 0.2, sustain: 0.7 } */
		let env, attack = 0.01, decay = 0, sustain = 0, release = 0.01, sustainLevel = 1;
		attack = envelope.a;
		decay = envelope.d;
		release = envelope.r;
		if (envelope.s !== undefined) {
			sustain = envelope.s;
		} else {
			sustain = 0;
		}
		sustainLevel = envelope.sustain;

		let duration = attack + decay + sustain + release; // IIRC we potentially shouldn't have sustain included but our ADSR node does

		env = createADSRNode(ctx, t, attack, decay, sustain, release, sustainLevel);
		osc.connect(env).connect(ctx.destination);
		// TODO: ^^ Take target node instead? Or just return the env node?
		osc.start(t);
		osc.stop(t + duration + stopTime);	// Requires some time after stop to not pop
	};

	// https://stackoverflow.com/questions/29584420/how-to-manipulate-the-contents-of-an-audio-tag-and-create-derivative-audio-tags
	// http://soundfile.sapp.org/doc/WaveFormat/

	let bufferToWave = (buffer, totalSamples) => {
		let numberOfChannels = buffer.numberOfChannels,
			length = totalSamples * numberOfChannels * 2 + 44,
			outputBuffer = new ArrayBuffer(length),
			view = new DataView(outputBuffer),
			channels = [], i, sample,
			offset = 0, pos = 0;

		let setUint16 = (value) => {
			view.setUint16(pos, value, true);
			pos += 2;
		};
		let setUint32 = (value) => {
			view.setUint32(pos, value, true);
			pos += 4;
		};

		setUint32(0x46464952);			// "RIFF"
		setUint32(length - 8);			// file length - 8
		setUint32(0x45564157);			// "WAVE"

		setUint32(0x20746d66);			// "fmt" chunk
		setUint32(16);					// length = 16
		setUint16(1);					// PCM (uncompressed)
		setUint16(numberOfChannels);
		setUint32(buffer.sampleRate);
		setUint32(buffer.sampleRate * 2 * numberOfChannels);	// avg. bytes/sec
		setUint16(numberOfChannels * 2);						// block-align
		setUint16(16);											// 16-bit (hardcoded)

		setUint32(0x61746164);			// "data" - chunk
		setUint32(length - pos - 4);	// chunk length

		// write interleaved data
		for (i = 0; i < buffer.numberOfChannels; i++) {
			channels.push(buffer.getChannelData(i));
		}

		while (pos < length) {
			for (i = 0; i < numberOfChannels; i++) {
				sample = Math.max(-1, Math.min(1, channels[i][offset]));			// clamp
				sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;	// scale to 16-bit signed int
				// ^^ question wtf is this doing? arguement for sample *= 32768
				setUint16(sample);		// write 16-bit sample
			}
			offset++;
		}

		return new Blob([outputBuffer], { type: "audio/wav" });
	};

	let createDownload = (anchorId, filename, buffer, totalSamples) => {
		let file = URL.createObjectURL(bufferToWave(buffer, totalSamples));

		let downloadLink = document.getElementById(anchorId);
		downloadLink.href = file;
		downloadLink.download = filename ? filename + ".wav" : "export.wav";

		// TODO: Balance with URL.revokeObjectURL().
	};

	let renderToDownload = (offlineAudioContext, anchorId, filename) => {
		offlineAudioContext.startRendering().then((renderedBuffer) => {
			createDownload(anchorId, filename, renderedBuffer, offlineAudioContext.length);
		}).catch((error) => { 
			console.error(error);
		});
	};

	exports.exportBuffer = (anchorId, buffer) => {
		let offlineAudioContext = new OfflineAudioContext({
			numberOfChannels: 2,
			length: 44100 * buffer.duration,
			sampleRate: 44100
		});

		let source = offlineAudioContext.createBufferSource();
		source.buffer = buffer;
		source.connect(offlineAudioContext.destination);
		source.start();

		renderToDownload(offlineAudioContext, anchorId);
	};

	exports.exportNote = (anchorId, octave, note, waveform, envelope) => {
		let duration = envelope.a + envelope.s + envelope.d + envelope.r + stopTime;
		let offlineAudioContext = new OfflineAudioContext({
			numberOfChannels: 2,
			length: 44100 * duration,
			sampleRate: 44100
		});
		
		let freq = exports.noteTable[octave][note];
		playNote(offlineAudioContext, freq, waveform, envelope, 0);

		renderToDownload(offlineAudioContext, anchorId, waveform + note + octave);
	};

	return exports;
})();