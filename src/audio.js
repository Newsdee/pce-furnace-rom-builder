// ============== WAV -> PCM ==============
async function convertWAVtoPCE(file) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ab = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(ab);
    const target = 8000;
    const samples = Math.floor(audio.length * target / audio.sampleRate);
    const pcm = new Uint8Array(samples);
    const ch = audio.getChannelData(0);
    for (let i = 0; i < samples; i++) {
        let v = ch[Math.floor(i * audio.sampleRate / target)] * 127;
        v = Math.max(-128, Math.min(127, Math.round(v))) + 128;
        pcm[i] = v;
    }
    pcmData = pcm;
    document.getElementById('pcmStatus').innerHTML = `[OK] ${file.name}<br>${samples} bytes`;
}
