module.exports = (function(){
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
		noteFreq[0]["A"] = 27.50000000000000;
		noteFreq[0]["A#"] = 29.13523509488062;
		noteFreq[0]["B"] = 30.86770632850776;

		noteFreq[1]["C"] = 32.70319566257483;
		noteFreq[1]["C#"] = 34.64782887210901;
		noteFreq[1]["D"] = 36.70809598967595;
		noteFreq[1]["D#"] = 38.89087296526011;
		noteFreq[1]["E"] = 41.20344461410874;
		noteFreq[1]["F"] = 43.65352892912549;
		noteFreq[1]["F#"] = 46.24930283895430;
		noteFreq[1]["G"] = 48.99942949771866;
		noteFreq[1]["G#"] = 51.91308719749314;
		noteFreq[1]["A"] = 55.00000000000000;
		noteFreq[1]["A#"] = 58.27047018976124;
		noteFreq[1]["B"] = 61.73541265701551;

		noteFreq[2]["C"] = 65.40639132514966;
		noteFreq[2]["C#"] = 69.29565774421802;
		noteFreq[2]["D"] = 73.41619197935189;
		noteFreq[2]["D#"] = 77.78174593052023;
		noteFreq[2]["E"] = 82.40688922821748;
		noteFreq[2]["F"] = 87.307057858250971;
		noteFreq[2]["F#"] = 92.4986056779086;
		noteFreq[2]["G"] = 97.99885899543732;
		noteFreq[2]["G#"] = 103.82617439498628;
		noteFreq[2]["A"] = 110.000000000000000;
		noteFreq[2]["A#"] = 116.54094037952248;
		noteFreq[2]["B"] = 123.47082531403103;

		noteFreq[3]["C"] = 130.8127826502993;
		noteFreq[3]["C#"] = 138.5913154884361;
		noteFreq[3]["D"] = 146.8323839587038;
		noteFreq[3]["D#"] = 155.56349186104046;
		noteFreq[3]["E"] = 164.81377845643496;
		noteFreq[3]["F"] = 174.614115716501942;
		noteFreq[3]["F#"] = 184.9972113558172;
		noteFreq[3]["G"] = 195.9977179908747;
		noteFreq[3]["G#"] = 207.6523487899726;
		noteFreq[3]["A"] = 220.000000000000000;
		noteFreq[3]["A#"] = 233.08188075904496;
		noteFreq[3]["B"] = 246.94165062806206;

		noteFreq[4]["C"] = 261.6255653005986;
		noteFreq[4]["C#"] = 277.1826309768721;
		noteFreq[4]["D"] = 293.6647679174076;
		noteFreq[4]["D#"] = 311.1269837220809;
		noteFreq[4]["E"] = 329.6275569128699;
		noteFreq[4]["F"] = 349.228231433003884;
		noteFreq[4]["F#"] = 369.9944227116344;
		noteFreq[4]["G"] = 391.9954359817493;
		noteFreq[4]["G#"] = 415.3046975799451;
		noteFreq[4]["A"] = 440.0000000000000;
		noteFreq[4]["A#"] = 466.1637615180899;
		noteFreq[4]["B"] = 493.8833012561241;

		noteFreq[5]["C"] = 523.251130601197;
		noteFreq[5]["C#"] = 554.3652619537442;
		noteFreq[5]["D"] = 587.3295358348151;
		noteFreq[5]["D#"] = 622.2539674441618;
		noteFreq[5]["E"] = 659.25511382574;
		noteFreq[5]["F"] = 698.45646286600777;
		noteFreq[5]["F#"] = 739.9888454232688;
		noteFreq[5]["G"] = 783.9908719634986;
		noteFreq[5]["G#"] = 830.6093951598903;
		noteFreq[5]["A"] = 880.0000000000000;
		noteFreq[5]["A#"] = 932.32752303618;
		noteFreq[5]["B"] = 987.766602512248;

		noteFreq[6]["C"] = 1046.5022612023945;
		noteFreq[6]["C#"] = 1108.730523907488;
		noteFreq[6]["D"] = 1174.659071669630;
		noteFreq[6]["D#"] = 1244.507934888324;
		noteFreq[6]["E"] = 1318.5102276514797;
		noteFreq[6]["F"] = 1396.91292573201554;
		noteFreq[6]["F#"] = 1479.9776908465376;
		noteFreq[6]["G"] = 1567.981743926997;
		noteFreq[6]["G#"] = 1661.218790319781;
		noteFreq[6]["A"] = 1760.000000000000;
		noteFreq[6]["A#"] = 1864.6550460723597;
		noteFreq[6]["B"] = 1975.5332050244965;

		noteFreq[7]["C"] = 2093.004522404789;
		noteFreq[7]["C#"] = 2217.461047814977;
		noteFreq[7]["D"] = 2349.318143339261;
		noteFreq[7]["D#"] = 2489.015869776647;
		noteFreq[7]["E"] = 2637.0204553029594;
		noteFreq[7]["F"] = 2793.825851464031075;
		noteFreq[7]["F#"] = 2959.9553816930752;
		noteFreq[7]["G"] = 3135.963487853994;
		noteFreq[7]["G#"] = 3322.437580639561;
		noteFreq[7]["A"] = 3520.000000000000;
		noteFreq[7]["A#"] = 3729.310092144719;
		noteFreq[7]["B"] = 3951.066410048993;

		noteFreq[8]["C"] = 4186.009044809578;
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