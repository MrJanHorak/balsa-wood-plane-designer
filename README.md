# ✈️ Balsa Wood Plane Designer

> **Design, Simulate, and Print Custom Balsa Wood Gliders Right From Your Browser!**

---

## 🚀 Try It Live!

👉 **[Launch the App: balsa-wood-plane-designer.vercel.app](https://balsa-wood-plane-designer.vercel.app/?utm_source=gemini)**

No software installation or CAD experience required! Simply adjust parameters, view your 3D glider in real time, and print out exact 1:1 scale templates to trace directly onto balsa wood.

---

## 🌟 What is Balsa Wood Plane Designer?

**Balsa Wood Plane Designer** is an open-source, web-based CAD, simulation, and pattern-generation tool built for educators, students, parents, and hobbyists.

Whether you're building a simple **slot-and-tab interlocking glider** for an elementary science fair or tweaking wingspans and center-of-gravity (CG) balance for a high school physics lab, this app bridges the gap between digital design and hands-on woodworking.

---

## ✨ Key Features

* **🧱 Interlocking Slot & Tab Generator**: Automatically cuts precise interlocking slots for wings, fuselages, and tailplanes.
* **🎨 Interactive 3D Viewport**: Built with **Three.js** to show dynamic balsa wood textures, assembly transparency, and real-time mesh updates.
* **⚖️ Real-Time Mass & CG Balance Engine**: Automatically calculates the center of gravity (CG) vs. aerodynamic neutral point to tell you if your plane is nose-heavy, tail-heavy, or perfectly balanced.
* **🖨️ Scaled 1:1 Multi-Page PDF Exporter**: Generates vector patterns locked at 100% scale across standard A4/US Letter printer paper with alignment marks and physical calibration rulers.
* **🌲 Wood Grain Awareness**: Designed specifically around physical balsa sheet stock dimensions (1/32", 1/16", 1/8") and grain constraints to prevent split wood.
* **🎓 STEM & Classroom Friendly**: Made to be accessible to elementary students while staying grounded in real aerospace principles.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js](https://nextjs.org/?utm_source=gemini) (React & TypeScript)
* **3D Graphics**: [Three.js](https://threejs.org/?utm_source=gemini) & `@react-three/fiber`
* **Styling**: [Tailwind CSS](https://tailwindcss.com/?utm_source=gemini)
* **PDF Vector Engine**: [jsPDF](https://github.com/parallax/jsPDF?utm_source=gemini)
* **Deployment**: [Vercel](https://vercel.com/?utm_source=gemini)

---

## 🚦 Getting Started Locally

Want to run the project on your own computer or contribute new features?

### Prerequisites

* [Node.js](https://nodejs.org/?utm_source=gemini) (v18.0 or higher)
* `npm` or `yarn` or `pnpm`

### Installation

1. **Clone the repository**:
```bash
git clone [https://github.com/MrJanHorak/balsa-wood-plane-designer.git](https://github.com/MrJanHorak/balsa-wood-plane-designer.git?utm_source=gemini)
cd balsa-wood-plane-designer
```


2. **Install dependencies**:
```bash
npm install

```


3. **Start the development server**:
```bash
npm run dev

```


4. **Open in browser**:
Navigate to [http://localhost:3000](http://localhost:3000?utm_source=gemini) to see your local app running!

---

## 🗺️ Project Roadmap

* [x] **Phase 1 (MVP)**: Parametric interlocking glider builder, 3D viewport, mass/CG calculations, and scaled multi-page vector PDF generation.
* [ ] **Phase 2 (Physics & Lab)**:
  * [ ] Interactive "Test Launch" flight trajectory simulator.
  * [ ] Particle-stream "Wind Tunnel" visualizer.
  * [ ] Automated 2D sheet nesting (bin-packing) to optimize balsa wood usage.
  * [ ] "Dual UI Mode" toggle (Beginner/STEM vs. Advanced Aerospace).


* [ ] **Phase 3 (Community)**:
  * [ ] URL state sharing (share a design with a single link).
  * [ ] Community plan repository with fork/remix capabilities.



---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **AGPLv3 license**. See [LICENSE](LICENSE.md) for more information.

---