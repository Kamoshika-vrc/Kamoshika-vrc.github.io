// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js'; // @@@

/*function fmod(a, b) {
  return a - Math.floor(a / b) * b;
}*/

// DOM がパースされたことを検出するイベントを設定
window.addEventListener('DOMContentLoaded', () => {
  // HTML 上に定義されている親要素への参照を取得
  const wrapper = document.querySelector('#webgl');
  // 制御クラスのインスタンスを生成
  const app = new ThreeApp(wrapper);
  // 描画
  app.render();
}, false);

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 1.0, 15.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor:0x666666,        // 画面をクリアする色
    width: window.innerWidth,   // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数 @@@
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 1.0, // 光の強度
    position: new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数 @@@
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1, // 光の強度
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x8c8c8c, // マテリアルの基本色
    //color: 0x44dd88, // マテリアルの基本色
    specular: 0xc8c8c8, // 鏡面反射
  };

  renderer;   // レンダラ
  scene;      // シーン
  clock; // 時間取得用
  camera;     // カメラ
  // directionalLight; // 平行光源（ディレクショナルライト） @@@
  pointLight; // 点光源
  ambientLight; // 環境光（アンビエントライト） @@@
  material;   // マテリアル
  boxGeometry; // ボックスジオメトリ @@@
  boxArray; // ボックスメッシュの配列 @@@
  boxSize; // ボックスの大きさ
  boxCount; // ボックスの数
  controls;   // オービットコントロール1
  //axesHelper; // 軸ヘルパー @@@
  //isDown;     // キーの押下状態用フラグ @@@

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラの初期化
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーンの初期化
    this.scene = new THREE.Scene();

    this.clock = new THREE.Clock();

    // カメラの初期化
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // // ディレクショナルライト（平行光源） @@@
    // this.directionalLight = new THREE.DirectionalLight(
    //   ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
    //   ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    // );
    // this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    // this.scene.add(this.directionalLight);
    this.pointLight = new THREE.PointLight(0xffffff, 100.0);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // マテリアルの初期化
    //this.material = new THREE.MeshBasicMaterial(ThreeApp.MATERIAL_PARAM);
    //this.material = new THREE.MeshLambertMaterial(ThreeApp.MATERIAL_PARAM); // @@@
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM); // @@@

    // ジオメトリの初期化
    // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する @@@
    this.boxCount = 100;
    this.boxSize = 1.0;
    //this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.boxGeometry = new THREE.BoxGeometry(this.boxSize, this.boxSize, this.boxSize);
    this.boxArray = [];
    for (let i = 0; i < this.boxCount; ++i) {
      // ボックスメッシュのインスタンスを生成
      const box = new THREE.Mesh(this.boxGeometry, this.material);
      // シーンに追加する
      this.scene.add(box);
      // 配列に入れておく
      this.boxArray.push(box);
    }

    // 軸ヘルパー
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // render メソッドはブラウザ制御で再帰的に呼び出されるので this を固定する @@@
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ @@@
    // this.isDown = false;

    // // キーの押下や離す操作を検出できるようにする @@@
    // window.addEventListener('keydown', (keyEvent) => {
    //   // スペースキーが押されている場合はフラグを立てる
    //   switch (keyEvent.key) {
    //     case ' ':
    //       this.isDown = true;
    //       break;
    //     default:
    //   }
    // }, false);
    // window.addEventListener('keyup', (keyEvent) => {
    //   // なんらかのキーが離された操作で無条件にフラグを下ろす
    //   this.isDown = false;
    // }, false);

    // リサイズイベント
    // ウィンドウサイズの変更に対応
    window.addEventListener('resize', () => {
      // レンダラの大きさを設定
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // カメラが撮影する視錐台のアスペクト比を再設定
      this.camera.aspect = window.innerWidth / window.innerHeight;
      // カメラのパラメータが変更されたときは行列を更新する
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定 @@@
    // ディスプレイのリフレッシュレートに合わせて、最適な頻度で再描画処理を呼び出せる
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // 経過時間を取得
    const elapsedTime = this.clock.getElapsedTime();
    const speed = 3.0;
    const time = elapsedTime * speed;
    const a = Math.PI / 2.0;
    const n = Math.floor(time / a);
    //const phase = fmod(time, Math.PI / 2.0) - Math.PI / 4.0;
    const phase = time - a * n - a * 0.5;
    const radius = this.boxSize * 0.5 * Math.SQRT2; // 回転の半径
    let posX = radius * Math.sin(phase);
    let posY = radius * Math.cos(phase);
    let rotZ = -phase + Math.PI / 4.0;

    this.boxArray.forEach((box, i) => {
      box.position.x = posX;
      box.position.x += ((n + i * 2) % 20 - 9.5) * this.boxSize;
      box.position.y = posY;
      let zIndex = Math.floor(i / 10.0);
      box.position.z = (zIndex - 4.5) * 2.0;
      box.rotation.z = rotZ;
    });

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}