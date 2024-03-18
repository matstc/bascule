class SynthLfo extends HTMLElement {
  rate = 0.25
  target
  depth = 10
  baseValue
  shapes = ["Sine", "Square", "Saw", "Random", "Smooth Random"]
  startTime
  inverted = false
  randomTarget
  lastRandomTarget

  connectedCallback() {
    this.shape = this.shapes[0]
    this.addShapeSelection()
    this.addRateSelection()
    this.addDepthSelection()
    this.addInvertCheckbox()
    this.addTargetSelection()
  }

  addInvertCheckbox() {
    const container = document.createElement("div")
    container.classList.add("other-parameter")
    const label = document.createElement("div")
    label.classList.add("label")
    label.textContent = "Invert"
    container.appendChild(label)

    const input = document.createElement("input")
    input.type = "checkbox"
    input.addEventListener("change", e => {
      this.inverted = e.target.checked
    })
    container.appendChild(input)

    this.appendChild(container)
  }

  addDepthSelection() {
    const synthKnob = document.createElement("synth-knob")
    synthKnob.setAttribute("parameter", "depth")
    synthKnob.setAttribute("value", this.depth)
    synthKnob.setAttribute("unit", "%")
    synthKnob.setAttribute("min", 1)
    synthKnob.setAttribute("max", 100)

    synthKnob.addEventListener("bascule.change", e => {
      this.depth = e.detail.newValue
    })

    this.appendChild(synthKnob)
  }

  addShapeSelection() {
    const container = document.createElement("div")
    container.classList.add("other-parameter")
    const label = document.createElement("div")
    label.classList.add("label")
    label.textContent = "LFO"
    container.appendChild(label)

    const select = document.createElement("select")
    for (let shape of this.shapes) {
      const option = document.createElement("option")
      option.textContent = shape
      option.value = shape
      if (shape === this.shape) option.selected = true
      select.appendChild(option)
    }

    select.addEventListener("change", e => {
      this.shape = e.target.value
    })
    container.appendChild(select)

    this.appendChild(container)
  }

  addRateSelection() {
    const synthKnob = document.createElement("synth-knob")
    synthKnob.setAttribute("parameter", "rate")
    synthKnob.setAttribute("value", this.rate)
    synthKnob.setAttribute("min", 0.001)
    synthKnob.setAttribute("max", 100)
    synthKnob.setAttribute("unit", "Hz")
    synthKnob.setAttribute("decimal-places", 3)
    synthKnob.setAttribute("acceleration", 0.001)

    synthKnob.addEventListener("bascule.change", e => {
      this.rate = e.detail.newValue
    })

    this.appendChild(synthKnob)
  }

  addTargetSelection() {
    const container = document.createElement("div")
    container.classList.add("other-parameter")
    const label = document.createElement("div")
    label.classList.add("label")
    label.textContent = "Target"
    const targetDisplay = document.createElement("div")
    targetDisplay.textContent = "None"
    targetDisplay.classList.add("target-display")
    container.appendChild(label)
    container.appendChild(targetDisplay)

    const button = document.createElement("button")
    button.textContent = "PICK"
    button.addEventListener("click", () => {
      if (button.textContent === "CLEAR") {
        this.target = null
        targetDisplay.textContent = "None"
        button.textContent = "PICK"
        button.blur()
      } else {
        document.body.addEventListener("click", e => {
          const synthKnob = e.target.matches("synth-knob") ? e.target : e.target.closest("synth-knob")

          if (synthKnob) {
            button.blur()
            targetDisplay.textContent = synthKnob.displayName
            this.target = synthKnob
            this.startTime = new Date().getTime()
            button.textContent = "CLEAR"
            this.baseValue = synthKnob.value

            synthKnob.addEventListener("bascule.pointerdown", () => {
              this.userDragging = true
            })

            synthKnob.addEventListener("bascule.pointerup", () => {
              this.userDragging = false
            })

            synthKnob.addEventListener("bascule.change", e => {
              if (e.detail?.triggeredBy === "lfo") return

              this.startTime = new Date().getTime() % 500
              this.baseValue = e.detail.newValue
              this.randomTarget = null
              this.lastRandomTarget = null
            })

            this.go()
          }
        }, { capture:true, once: true })
      }
    })
    container.appendChild(button)
    this.appendChild(container)
  }

  go() {
    if (!this.target) return

    if (this.userDragging) {
      requestAnimationFrame(this.go.bind(this))
      return
    }

    this.target.setValue(this.calculateNewValue(), { triggeredBy: "lfo" })
    requestAnimationFrame(this.go.bind(this))
  }

  calculateNewValue() {
    const currentTick = new Date().getTime()
    let elapsed = null
    const msElapsed = currentTick - this.startTime
    const rateInMs = 1000 / this.rate
    const cyclesElapsed = Math.floor(msElapsed / rateInMs)

    if (cyclesElapsed) {
      this.startTime = this.startTime + cyclesElapsed * rateInMs
    }

    elapsed = (currentTick - this.startTime) % rateInMs

    const range = (parseFloat(this.target.max || 100, 10) - parseFloat(this.target.min || 0, 10)) * this.depth / 100
    let diff = 0

    if (this.shape === "Sine") {
      const sine = Math.sin(elapsed / rateInMs * 2 * Math.PI)
      diff = range / 2 * sine
    } else if (this.shape === "Square") {
      if (elapsed / rateInMs <= 0.5) {
        diff = range
      } else {
        diff = 0
      }
    } else if (this.shape === "Saw") {
      diff = elapsed / rateInMs * range
    } else if (this.shape === "Random" || this.shape === "Smooth Random") {
      if (!this.randomTarget || cyclesElapsed) {
        this.lastRandomTarget = this.randomTarget
        this.randomTarget = Math.floor(Math.random() * range) + this.baseValue - range / 2
      }
      
      if (this.shape === "Random") {
        diff = this.randomTarget - this.baseValue
      } else if (this.shape === "Smooth Random") {
        diff = this.randomTarget - (this.lastRandomTarget || this.baseValue)
        diff = elapsed / rateInMs * diff
        if (this.inverted) diff = 0 - diff
        return (this.lastRandomTarget || this.baseValue) + diff
      }
    }

    if (this.inverted) diff = 0 - diff
  
    return this.baseValue + diff
  }
}

customElements.define("synth-lfo", SynthLfo)
