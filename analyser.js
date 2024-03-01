class Analyser {
  width
  height
  analyser
  rootNode
  spectrum
  bar

  constructor(audioContext, rootNode) {
    this.width = rootNode.getBoundingClientRect().width
    this.height = 240
    this.audioContext = audioContext
    this.rootNode = rootNode
    this.createAnalyser()
    this.createSpectrum()
  }

  createAnalyser() {
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.minDecibels = -100
    this.analyser.maxDecibels = 0
    this.analyser.smoothingTimeConstant = 0.5
    this.analyser.fftSize = 1024
  }

  createSpectrum() {
    this.spectrum = document.createElement("div")
    this.spectrum.classList.add("spectrum")
    this.bars = []
    const count = this.analyser.frequencyBinCount
    const maxHertz = 20000
    const hertzInterval = maxHertz / count

    for (let i = 0; i < count; i++) {
      const leftEdge = hertzInterval * i + 20
      const rightEdge = hertzInterval * (i + 1) + 20
      const proportionLeft = Math.log(maxHertz / leftEdge) / Math.log(2) / 10
      const proportionRight = Math.log(maxHertz / rightEdge) / Math.log(2) / 10

      const bar = document.createElement("div")
      bar.style.flexGrow = proportionLeft - proportionRight
      bar.classList.add("spectrum--bar")
      this.spectrum.appendChild(bar)
      bar.dataset.frequency = rightEdge
      this.bars.push(bar)
    }

    this.rootNode.appendChild(this.spectrum)
  }

  visualize() {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      requestAnimationFrame(draw)
      this.analyser.getByteFrequencyData(dataArray)

      for (let i = 0; i < bufferLength; i++) {
        this.bars[i].style.height = `${dataArray[i] / 200 * 100}%`
      }
    }

    draw()
  }
}
