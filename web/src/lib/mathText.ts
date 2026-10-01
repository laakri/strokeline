const symbols: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ϵ",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π", varpi: "ϖ",
  rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ",
  phi: "φ", varphi: "ϕ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ",
  Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ",
  Psi: "Ψ", Omega: "Ω", times: "×", cdot: "·", ast: "∗", div: "÷", pm: "±", mp: "∓",
  neq: "≠", ne: "≠", le: "≤", leq: "≤", ge: "≥", geq: "≥", approx: "≈", equiv: "≡",
  sim: "∼", propto: "∝", infinity: "∞", partial: "∂", nabla: "∇", sum: "∑", prod: "∏",
  int: "∫", iint: "∬", oint: "∮", forall: "∀", exists: "∃", in: "∈", notin: "∉",
  subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", cup: "∪", cap: "∩",
  emptyset: "∅", to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔",
  Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔", therefore: "∴", because: "∵",
  degree: "°", angle: "∠", perp: "⊥", parallel: "∥", percent: "%", prime: "′",
  ldots: "…", cdots: "⋯", land: "∧", lor: "∨", neg: "¬", not: "¬", hbar: "ℏ",
  nless: "≮", ngtr: "≯", nleq: "≰", ngeq: "≱", nsubseteq: "⊈", nsupseteq: "⊉",
  nmid: "∤", nexists: "∄", nparallel: "∦", ncong: "≇", mid: "∣", infty: "∞", dots: "…", vdots: "⋮", ddots: "⋱",
  oplus: "⊕", otimes: "⊗", odot: "⊙", circ: "∘", bullet: "•", triangle: "△",
  square: "□", diamond: "◇", ell: "ℓ", Re: "ℜ", Im: "ℑ", wp: "℘", mho: "℧",
  langle: "〈", rangle: "〉", lvert: "|", rvert: "|", lVert: "‖", rVert: "‖",
  lbrace: "{", rbrace: "}", lceil: "⌈", rceil: "⌉", lfloor: "⌊", rfloor: "⌋",
}

const superscript: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
}
const subscript: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
}

function groupAt(source: string, start: number): { value: string; end: number } | undefined {
  if (source[start] !== "{") return undefined
  let depth = 1
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === "{") depth++
    else if (source[index] === "}" && --depth === 0) {
      return { value: source.slice(start + 1, index), end: index + 1 }
    }
  }
  return { value: source.slice(start + 1), end: source.length }
}

function scriptValue(value: string, map: Record<string, string>, marker: string): string {
  const formatted = formatInlineMath(value)
  const converted = [...formatted].map((char) => map[char]).join("")
  return [...formatted].every((char) => map[char]) ? converted : `${marker}(${formatted})`
}

function formatInlineMath(source: string): string {
  let output = ""
  for (let index = 0; index < source.length;) {
    const char = source[index]!
    if (char === "\\") {
      const match = source.slice(index + 1).match(/^[A-Za-z]+/)
      if (!match) {
        output += source[index + 1] ?? "\\"
        index += source[index + 1] ? 2 : 1
        continue
      }
      const command = match[0]
      let next = index + command.length + 1
      if (["frac", "dfrac", "tfrac", "binom"].includes(command)) {
        const numerator = groupAt(source, next)
        const denominator = numerator && groupAt(source, numerator.end)
        if (numerator && denominator) {
          const top = formatInlineMath(numerator.value)
          const bottom = formatInlineMath(denominator.value)
          output += command === "binom" ? `(${top} choose ${bottom})` : `(${top})⁄(${bottom})`
          index = denominator.end
          continue
        }
      }
      if (command === "sqrt") {
        let degree: string | undefined
        if (source[next] === "[") {
          const close = source.indexOf("]", next + 1)
          if (close >= 0) { degree = source.slice(next + 1, close); next = close + 1 }
        }
        const radicand = groupAt(source, next)
        if (radicand) {
          output += `${degree === "3" ? "∛" : degree === "4" ? "∜" : "√"}${degree && degree !== "3" && degree !== "4" ? `[${degree}]` : ""}(${formatInlineMath(radicand.value)})`
          index = radicand.end
          continue
        }
      }
      const wrapped = ["text", "mathrm", "mathbf", "mathit", "operatorname", "left", "right", "displaystyle", "textstyle"].includes(command)
      if (["left", "right", "displaystyle", "textstyle"].includes(command) && !source.startsWith("{", next)) {
        index = next
        continue
      }
      if (wrapped) {
        const group = groupAt(source, next)
        if (group) {
          output += formatInlineMath(group.value)
          index = group.end
          continue
        }
      }
      if (command === "overline" || command === "bar" || command === "hat" || command === "vec") {
        const group = groupAt(source, next)
        if (group) {
          const mark = command === "vec" ? "⃗" : command === "hat" ? "̂" : "̅"
          output += [...formatInlineMath(group.value)].map((value) => value + mark).join("")
          index = group.end
          continue
        }
      }
      if (command === "mathbb" || command === "mathcal") {
        const group = groupAt(source, next)
        if (group) {
          const alphabet = command === "mathbb"
            ? { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ", k: "K" }
            : { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" }
          output += [...group.value].map((letter) => alphabet[letter as keyof typeof alphabet] ?? letter).join("")
          index = group.end
          continue
        }
      }
      output += symbols[command] ?? command
      index += command.length + 1
      continue
    }
    if (char === "^" || char === "_") {
      const map = char === "^" ? superscript : subscript
      const value = groupAt(source, index + 1)
      const raw = value?.value ?? source[index + 1] ?? ""
      output += scriptValue(raw, map, char)
      index = value?.end ?? Math.min(source.length, index + 2)
      continue
    }
    if (char === "{") { index++; continue }
    if (char === "}") { index++; continue }
    output += char
    index++
  }
  return output.replace(/\s+/g, " ").trim()
}

export function formatMathText(text: string): string {
  return text
    .replace(/\\\((.+?)\\\)/g, (_match, math: string) => formatInlineMath(math))
    .replace(/\\\[(.+?)\\\]/g, (_match, math: string) => formatInlineMath(math))
    .replace(/\$([^$\n]+)\$/g, (_match, math: string) => formatInlineMath(math))
}
