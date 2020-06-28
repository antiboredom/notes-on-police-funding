const someNiceColors = [
  "#fc3503",
  "#fcdf03",
  "#5afc03",
  "#03e7fc",
  "#0331fc",
  "#ce03fc",
  "#fc0384",
  // "#801d1d",
  // "#45801d",
  // "#1d8076",
  // "#1d3680",
  // "#741d80",
  // "#801d45",
];
const ThreeManager = {
  async init() {
    this.canvas = document.createElement("canvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setClearColor(0xffffff, 0);

    this.renderer.setScissorTest(true);

    this.sceneElements = [];

    this.fonts = {};
    this.fontLoader = new THREE.FontLoader();

    await this.loadFont("helvetiker_bold.json");

    requestAnimationFrame(this.render.bind(this));
  },

  loadFont(fontname) {
    return new Promise((resolve, reject) => {
      if (this.fonts[fontname]) return resolve(this.fonts[fontname]);

      this.fontLoader.load(fontname, (font, err) => {
        if (font) {
          this.fonts[fontname] = font;
          resolve(font);
        } else return reject(err);
      });
    });
  },

  addScene(elem, fn) {
    const ctx = document.createElement("canvas").getContext("2d");
    elem.appendChild(ctx.canvas);
    this.sceneElements.push({ elem, ctx, fn });
  },

  makeScene(elem) {
    const scene = new THREE.Scene();

    // const fov = 45;
    // const aspect = 2; // the canvas default
    // const near = 0.1;
    // const far = 5;
    // const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    // camera.position.set(0, 1, 2);
    // camera.lookAt(0, 0, 0);

    const camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    camera.position.z = 30;

    scene.add(camera);

    // const controls = new THREE.OrbitControls(camera, elem);
    const controls = new THREE.TrackballControls(camera, elem);
    controls.maxDistance = 130;
    controls.minDistance = 6;
    controls.update();

    const ambLight = new THREE.AmbientLight(0x404040, 2); // soft white light
    scene.add(ambLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.x = 0.1;
    directionalLight.position.y = 1;
    directionalLight.position.z = 1.5;
    scene.add(directionalLight);

    return { scene, camera, controls };
  },

  render(time) {
    time *= 0.001;

    for (const { elem, fn, ctx } of this.sceneElements) {
      // get the viewport relative position of this element
      const rect = elem.getBoundingClientRect();
      const { left, right, top, bottom, width, height } = rect;
      const rendererCanvas = this.renderer.domElement;

      const isOffscreen =
        bottom < 0 ||
        top > window.innerHeight ||
        right < 0 ||
        left > window.innerWidth;

      if (!isOffscreen) {
        // make sure the renderer's canvas is big enough
        if (rendererCanvas.width < width || rendererCanvas.height < height) {
          this.renderer.setSize(width, height, false);
        }

        // make sure the canvas for this area is the same size as the area
        if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
          ctx.canvas.width = width;
          ctx.canvas.height = height;
        }

        this.renderer.setScissor(0, 0, width, height);
        this.renderer.setViewport(0, 0, width, height);

        fn(time, rect);

        // copy the rendered scene to this element's canvas
        ctx.globalCompositeOperation = "copy";
        ctx.drawImage(
          rendererCanvas,
          0,
          rendererCanvas.height - height,
          width,
          height, // src rect
          0,
          0,
          width,
          height
        ); // dst rect
      }
    }

    requestAnimationFrame(this.render.bind(this));
  },
};

class PieChart {
  constructor(values, options) {
    let defaults = {
      radius: 5,
      hole: 0,
      spread: 0,
      height: 2,
      colors: null,
    };

    this.options = {
      ...defaults,
      ...options,
    };

    this.values = values;

    this.make();
  }

  make() {
    const colors = this.options.colors;

    this.pie = new THREE.Group();

    let start = 0;
    const total = this.values.reduce((a, b) => a + b, 0);

    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i];
      const angleTheta = (v / total) * (Math.PI * 2);
      const end = start + angleTheta;
      const color = colors && colors[i] ? colors[i] : this.randomColor();
      const seg = this.segment(
        this.options.radius,
        start,
        end,
        color,
        this.options.hole,
        this.options.height
      );

      if (this.options.spread > 0) {
        const spreadAngle = (start + end) / 2;
        seg.position.x = Math.cos(spreadAngle) * this.options.spread;
        seg.position.y = Math.sin(spreadAngle) * this.options.spread;
      }

      this.pie.add(seg);

      start += angleTheta;
    }
  }

  randomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  }

  segment(radius, start, end, color, hole, height) {
    const options = {
      curveSegments: 62,
      steps: 3,
      depth: height,
      bevelEnabled: false,
    };

    const shape = new THREE.Shape();

    if (hole == 0) {
      shape.moveTo(0, 0);
      shape.absarc(0, 0, radius, start, end, false);
      shape.lineTo(0, 0);
    } else {
      shape.moveTo(
        radius * hole * Math.cos(start),
        radius * hole * Math.sin(start)
      );
      shape.absarc(0, 0, radius, start, end, false);
      shape.absarc(0, 0, radius * hole, end, start, true);
    }

    const geom = new THREE.ExtrudeGeometry(shape, options);

    // geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: color,
    });

    const segment = new THREE.Mesh(geom, mat);

    return segment;
  }
}

Vue.component("datatable", {
  template: `
    <div class="datatable" ref="tbody">
      <table>
        <thead>
            <tr>
              <th v-for="header in data.columns" @click="onSort(header)">
                {{ header }}
                <span :class="{sortDir: true, activeColumn: sortKey==header}">
                  {{ reverse ? "▼" : "▲" }}
                </span>
              </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="row in sortedRows">
              <td v-for="(col, index) in row">
                {{col.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}}
              </td>
            </tr>
        </tbody>
      </table>
    </div>
  `,
  // {{data.columns[index].indexOf("$") > -1 ? "$" : ""}}
  props: ["data"],
  data: function () {
    return {
      // sortKey: null,
      sortKey: this.data.columns[this.data.columns.length - 1],
      reverse: true,
    };
  },
  methods: {
    onSort(key) {
      if (key == this.sortKey) {
        this.reverse = !this.reverse;
      } else {
        this.sortKey = key;
      }
      this.$refs.tbody.scrollTop = 0;
    },
  },
  computed: {
    sortedRows() {
      let index = this.data.columns.indexOf(this.sortKey);
      let modifier = this.reverse ? -1 : 1;
      if (typeof this.data.data[0][index] == "string") {
        return this.data.data.sort(
          (a, b) => a[index].localeCompare(b[index]) * modifier
        );
      } else {
        return this.data.data.sort((a, b) => (a[index] - b[index]) * modifier);
      }
    },
  },
});

Vue.component("serious-text", {
  template: `
    <div class="three-container" ref="threeContainer" :style="{background: gradient}"></div>
  `,
  props: ["line1", "line2", "colors"],
  data() {
    return {
      realcolors: [],
    };
  },
  mounted() {
    if (!this.colors || this.colors.length == 0) {
      this.realcolors = someNiceColors
        .slice()
        .sort(function () {
          return 0.5 - Math.random();
        })
        .slice(0, 2);
    } else {
      this.realcolors = this.colors;
    }
    const sceneRenderFunction = this.render(this.$refs.threeContainer);
    ThreeManager.addScene(this.$refs.threeContainer, sceneRenderFunction);
  },
  computed: {
    gradient() {
      // return `linear-gradient(top,  #11e8bb 0%, #8200c9 100%)`;
      // return `linear-gradient(90deg, #11e8bb 0%, #8200c9 100%)`
      // return `linear-gradient(180deg, ${this.realcolors[1]} 0%, ${this.realcolors[0]} 100%)`
      return `radial-gradient(#fff 0%, #ccc 100%)`;
    },
  },
  methods: {
    render(elem) {
      const { scene, camera, controls } = ThreeManager.makeScene(elem);

      const geometry = new THREE.TextGeometry(this.line1, {
        font: ThreeManager.fonts["helvetiker_bold.json"],
        size: 3,
        height: 3,
        curveSegments: 12,
        // bevelEnabled: true,
        // bevelThickness: 10,
        // bevelSize: 8,
        // bevelOffset: 0,
        // bevelSegments: 5
      });

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const mat = new THREE.MeshStandardMaterial({
        color: this.realcolors[0],
      });

      const mesh1 = new THREE.Mesh(geometry, mat);
      mesh1.position.x = -20;
      mesh1.rotation.x = -0.1;

      scene.add(mesh1);

      let mesh2;

      if (this.line2) {
        const geometry = new THREE.TextGeometry(this.line2, {
          font: ThreeManager.fonts["helvetiker_bold.json"],
          size: 3,
          height: 3,
          curveSegments: 12,
        });

        const mat = new THREE.MeshStandardMaterial({
          color: this.realcolors[1],
        });

        mesh2 = new THREE.Mesh(geometry, mat);
        mesh2.position.x = -20;
        mesh2.position.y = -(Math.abs(bbox.max.y) + Math.abs(bbox.min.y)) - 0.8;
        mesh2.rotation.x = -0.1;
        scene.add(mesh2);
      }

      camera.position.z = 80;

      return (time, rect) => {
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        controls.handleResize();
        controls.update();

        mesh2.rotation.y = -Math.sin(time) / 2;
        mesh1.rotation.y = Math.sin(time) / 2;
        ThreeManager.renderer.render(scene, camera);
      };
    },
  },
});

Vue.component("pie", {
  template: `
    <div class="pie">
      <div class="legend">
        <h3 class="chart-title">{{title}}</h3>
        <table class="key">
          <tr v-for="label in labels">
            <td><span class="label-color" :style="{backgroundColor: label.color}"></span></td>
            <td>{{label.label}}:</td>
            <td>{{label.percent.toLocaleString()}}%</td>
            <td>({{label.total.toLocaleString()}})</td>
          </tr>
        </table>
      </div>
      <div class="three-container" ref="threeContainer"></div>
    </div>
  `,

  props: ["keys", "values", "title"],

  data() {
    return {
      colors: [],
      speedy: Math.random() * 0.01,
      speedx: Math.random() * 0.01,
      speedz: Math.random() * 0.02 - 0.01,
    };
  },

  mounted() {
    // this.colors = new Array(this.values.length).fill().map(this.randomColor);
    this.colors = someNiceColors
      .slice()
      .sort(function () {
        return 0.5 - Math.random();
      })
      .slice(0, this.values.length);
    const sceneRenderFunction = this.render(this.$refs.threeContainer);
    ThreeManager.addScene(this.$refs.threeContainer, sceneRenderFunction);
  },

  computed: {
    labels() {
      const total = this.values.reduce((a, b) => a + b, 0);
      return this.values.map((v, i) => {
        return {
          percent: (100 * v) / total,
          total: v,
          label: this.keys[i],
          color: this.colors[i],
        };
      });
    },
  },

  methods: {
    render(elem) {
      const { scene, camera, controls } = ThreeManager.makeScene(elem);
      const pie = new PieChart(this.values, {
        radius: 3 + Math.random() * 3,
        colors: this.colors,
        hole: 0.2 + Math.random() / 3,
        height: 2 + Math.random() * 2,
        spread: Math.random() * 0.8,
        // radius: 5,
        // colors: this.colors,
        // hole: 0.3,
        // height: 3,
        // spread: 0.3,
      });

      pie.pie.rotation.x = -0.5;
      pie.pie.rotation.y = -0.5;

      scene.add(pie.pie);

      // camera.position.z = 30;

      return (time, rect) => {
        // pie.pie.rotation.y += this.speedy;
        // pie.pie.rotation.x += this.speedx;
        pie.pie.rotation.z += this.speedz;
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        // controls.handleResize();
        controls.update();
        ThreeManager.renderer.render(scene, camera);
      };
    },

    randomColor() {
      // return "#" + Math.floor(Math.random() * 16777215).toString(16);
      // return `hsl(${Math.random() * 255}, 82%, 56%)`;
      return someNiceColors[Math.floor(Math.random() * someNiceColors.length)];
    },
  },
});

Vue.component("cell", {
  template: `
    <div class="cell">
      <div class="input" v-if="item.code">
        <a href="#" class="code-toggle" @click.prevent="visible=!visible">{{ visible ? "Hide" : "Show"}} Code</a>
        <code v-html="item.code" v-show="visible"></code>
      </div>
      <div v-if="item.data && item.data.chart" class="outputs">
        <pie :keys="item.data.index" :values="item.data.data.flat()" :title="item.data.title"></pie>
      </div>
      <div v-else-if="item.data && item.data.bigtext" class="outputs">
        <serious-text :line1="item.data.line1" :line2="item.data.line2" :colors="item.data.colors"></serious-text>
      </div>
      <div v-else-if="item.svg" class="outputs">
        <div class="svg" v-html="item.svg"></div>
      </div>
      <div v-else-if="item.data" class="outputs">
        <datatable :data="item.data"></datatable>
      </div>
    </div>
  `,
  props: ["item"],
  data: function () {
    return { visible: false };
  },
});

const app = new Vue({
  el: "#app",
  data: {
    sections: [],
  },
  async created() {
    await ThreeManager.init();
    let response = await fetch("notes.json");
    let data = await response.json();
    this.sections = data;
  },
  computed: {
    randomColor() {
      return { color: `hsl(${Math.random() * 255}, 82%, 56%)` };
    },
  },
  methods: {},
});
