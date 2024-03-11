class SynthKnob extends HTMLElement {
  parameter
  displayName
  value = 0
  initialValue
  unit
  notchRotation = 0
  min
  max
  acceleration
  decimalPlaces
  knob
  baseValue
  lastPointerDownTime

  connectedCallback() {
    this.parameter = this.attributes["parameter"].value
    this.displayName = this.attributes["display-name"] ? this.attributes["display-name"].value : this.parameter
    this.initialValue = parseFloat(this.attributes["value"].value, 10)
    this.unit = this.attributes["unit"] ? this.attributes["unit"].value : ""
    this.min = this.attributes["min"] ? parseFloat(this.attributes["min"].value, 10) : undefined
    this.max = this.attributes["max"] ? parseFloat(this.attributes["max"].value, 10) : undefined
    this.acceleration = this.attributes["acceleration"] ? parseFloat(this.attributes["acceleration"].value, 10) : 1
    this.decimalPlaces = this.attributes["decimal-places"] ? parseInt(this.attributes["decimal-places"].value, 10) : undefined
    this.stickerPath = this.attributes["sticker-path"]?.value

    if (document.readyState !== "loading") {
      this.init()
    } else {
      document.addEventListener("DOMContentLoaded", () => this.init())
    }

    this.addEventListener("dblclick", () => {
      this.setValue(this.initialValue)
    })
  }

  init() {
    const label = document.createElement("div")
    label.classList.add("label")
    label.textContent = this.displayName
    const value = document.createElement("div")
    value.classList.add("value")
    this.knob = document.createElement("div")
    this.knob.classList.add("knob")
    const notch = document.createElement("div")
    notch.style.pointerEvents = "none"
    const baseNotch = document.createElement("div")
    baseNotch.style.pointerEvents = "none"

    if (this.stickerPath) {
      notch.style.display = "flex"
      notch.style.justifyContent = "center"
      notch.style.height = "100%"
      notch.style.alignItems = "center"

      const bascule = document.createElement("div")
      bascule.classList.add("bascule")
      const img = document.createElement("img")
      img.src = this.stickerPath
      img.classList.add("sticker")
      notch.appendChild(bascule)
      notch.appendChild(img)
    } else {
      baseNotch.classList.add("notch")
      baseNotch.classList.add("base-notch")
      notch.classList.add("notch")
    }

    this.knob.appendChild(notch)
    this.knob.appendChild(baseNotch)

    this.knob.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      this.lastPointerDownTime = new Date().getTime()

      if (!this.knob.matches(".focused")) {
        document.dispatchEvent(new CustomEvent("bascule.knob.focused", { detail: { shiftKey: e.shiftKey, target: this.knob }}))
      }

      this.dispatchEvent(new CustomEvent("bascule.pointerdown"))

      this.knob.classList.add("rotating")

      const onMove = (e) => {
        document.dispatchEvent(new CustomEvent("bascule.knob.dragging", { detail: { event: e }}))
        this.setValue(this.computeNewValue(e, -e.movementY))
      }

      document.body.addEventListener("pointermove", onMove)
      this.addEventListener("pointermove", onMove)

      const onUp = () => {
        this.knob.classList.remove("rotating")
        document.body.removeEventListener("pointermove", onMove)
        this.removeEventListener("pointermove", onMove)
        document.body.removeEventListener("pointerup", onUp)
        document.body.removeEventListener("pointerleave", onUp)
        this.dispatchEvent(new CustomEvent("bascule.pointerup"))
      }

      document.body.addEventListener("pointerup", onUp, { capture: true })
      document.body.addEventListener("pointerleave", onUp)
    })

    this.knob.addEventListener("pointerup", e => {
      if (!this.lastPointerDownTime || (new Date().getTime() - this.lastPointerDownTime) > 100) return // return if user is dragging

      if (this.knob.matches(".focused")) {
        this.knob.classList.remove("focused")
      } else {
        this.knob.classList.add("focused")
        document.dispatchEvent(new CustomEvent("bascule.knob.focused", { detail: { shiftKey: e.shiftKey, target: this.knob }}))
      }
    })

    document.addEventListener("bascule.knob.focused", e => {
      if (e.detail.target !== this.knob && !e.detail.shiftKey) {
        this.knob.classList.remove("focused")
      }
    })

    document.addEventListener("bascule.knob.dragging", e => {
      if (this.knob.matches(".focused")) {
        this.setValue(this.computeNewValue(e.detail.event, -e.detail.event.movementY))
      }
    })

    document.addEventListener("bascule.knob.blurred", e => {
        this.knob.classList.remove("focused")
    })

    document.addEventListener("keydown", e => {
      if (!this.knob.matches(".focused")) return

      if (e.key === "ArrowUp") {
        this.setValue(this.computeNewValue(e, 1))
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === "ArrowDown") {
        this.setValue(this.computeNewValue(e, -1))
        e.preventDefault()
        e.stopPropagation()
      }
    })

    this.appendChild(label)
    this.appendChild(value)
    this.appendChild(this.knob)
    this.setValue(this.initialValue, {}, true)
  }

  computeNewValue(event, delta) {
    return this.baseValue + (delta * this.acceleration * (event.shiftKey ? 10 : 1))
  }

  setValue(newValue, extraDetail, skipEvent) {
    const fullRange = this.unit === "ratio" ? 180 : 360
    if (this.min !== undefined) {
      newValue = Math.max(newValue, this.min)
    }
    if (this.max !== undefined) {
      newValue = Math.min(newValue, this.max)
    }

    if (!extraDetail || extraDetail.triggeredBy !== "lfo") {
      this.baseValue = newValue
    }

    if (this.min !== undefined && this.max !== undefined) {
      const range = this.max - this.min
      this.notchRotation = (newValue / range * fullRange) % 360
    } else {
      this.notchRotation = newValue % fullRange
    }

    if (this.unit === "ratio") this.notchRotation -= 90

    for (let element of this.querySelectorAll(".notch, .bascule")) {
      if (extraDetail && extraDetail.triggeredBy === "lfo" && element.matches(".base-notch")) { continue }

      element.style.transform = `rotate(${this.notchRotation}deg)`
    }

    if (!skipEvent) this.dispatchEvent(new CustomEvent("bascule.change", { detail: { parameter: this.parameter, newValue: newValue, oldValue: this.value, ...extraDetail } }))
    this.value = newValue
    const displayedValue = this.decimalPlaces ? this.value.toFixed(this.decimalPlaces) : parseInt(this.value, 10)
    const textContent = this.unit === "ratio" ? `${100 - displayedValue} % ${displayedValue} %` : `${displayedValue} ${this.unit}`
    this.querySelector(".value").textContent = textContent
  }
}

customElements.define("synth-knob", SynthKnob)
