# view-dxf

这是一个在线打开dxf图纸的插件，欢迎使用，如有不足，欢迎指正。

持续更新中...

## install
安装方式：`npm install view-dxf --save`
引用方式：`import Viewer from 'view-dxf'`

### 需要依赖的第三方库
需要ThreeJS的支持：`npm install three --save`
需要DxfParser的支持: `npm install dxf-parser --save`

## 使用例子

```javascript
let parser = new DxfParser()
let dxfData = parser.parseSync('拿到的dxf文件数据')

// helvetiker_regular.typeface.json 代表的是json格式的字体库数据
// cad-view代表的是你插入dxf的节点id，width代表显示时的宽，height代表显示时的高

let loader = new THREE.FontLoader()
loader.load('/static/lib/fonts/helvetiker_regular.typeface.json', (response) => {
	let cadCanvas = new Viewer(dxfData, document.getElementById('cad-view'), width, height, response, (dxfCallback) => {
		console.log(dxfCallback, '用户操作之后的回调函数')
	})
})
```


#### 如果使用script标签引入的方式，则运行下webpack --config webpack.config.js即可