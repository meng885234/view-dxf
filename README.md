# view-dxf

这是一个在线打开dxf图纸的插件，欢迎使用，如有不足，欢迎指正。
持续更新中...
* 注：支持所有的框架以及原生的引用方式

## install
安装方式：`npm install view-dxf --save`
引用方式：`import Viewer from 'view-dxf'`

### 依赖的第三方库
ThreeJS的支持：`npm install three --save`
DxfParser的支持: `npm install dxf-parser --save`

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

### DXF图纸模块

###### 1，切换图纸调用的接口:
```javascript
cadCanvas.sceneAddDataCtrl(dxfData)
```

###### 2，刷新调用的接口:
```javascript
cadCanvas.render()
```



### 批注模块

###### 按钮功能对应的节点ID:
绘制矩形框：`drawRectId`
绘制云线框：`drawCloudId`
绘制平面框：`drawPlaneId`
绘制箭头：`drawArrowId`
绘制椭圆：`drawEllipseId`
* eg: `<i id="drawRectId" class="iconfont off dxf-el-button icon-xiankuang1"></i>`
* 注：必不可少的有两部分：id="drawRectId" class="off"
* 说明：off为关闭状态时的类名，on为打开状态时的类名

----

###### 查询到的批注列表，在画布上显示所需要的数据格式，以及调用的接口：
* 数据格式以及最少含有的字段
```javascript
let data = [{annotationId: 320,	// 批注的唯一标识
	content: "批注内容详情",		// ---如果只是使用批注模块，这个参数不要传
	coordinate: {
		drawRectScreenCoord: {
			startX: 38,
			startY: 210,
			endX: 238,
			endY: 402
		},
		drawRectWorldCoord: {
			startX: -24.88748981868235,
			startY: 26.64271682686174,
			endX: 25.490601775931857,
			endY: 48.2797488960321
		},
		type: "drawCloudType"
	},	// 批注操作完成之后callback出来的数据，不用处理同步保存就好
	type: 1,    // 问题类型（1:一般问题，2：严重问题）---如果只是使用批注模块，这个参数不要传
	markNumber: 1,			// 右下角的标号，如果不传，则会使用数组的"index+1"的值
	roleColor: '#000000'	// 传入绘制的颜色值
}]
```
* 调用接口
```javascript
cadCanvas.dxfAnnotationListDrawCtrl(data)
```

----

###### 批量删除批注调用的接口：
* 数据格式以及最少含有的字段
```javascript
let data = [{annotationId: 320}, {annotationId: 321}]
```
* 调用接口
```javascript
cadCanvas.deleteAllDxfAnnotationCtrl(data)
```

----

###### 单条删除批注调用的接口：
* 调用接口
```javascript
cadCanvas.deleteDxfAnnotationCtrl(annotationId)
```

----

###### 清空画布调用的接口：
* 调用接口
```javascript
cadCanvas.sceneRemoveViewerCtrl()
```

----

###### 隐藏与显示构件或者批注的接口：
* 数据格式以及最少含有的字段
```javascript
let data = [{annotationId: 320}, {annotationId: 321}]
or data = [320, 321]
let show = true		// true为显示，false为隐藏
```
* 调用接口
```javascript
cadCanvas.showAllDxfAnnotationCtrl(data, show)
```

----

###### 定位当前批注到屏幕中间并高亮提示调用的接口：
* 数据格式以及最少含有的字段
```javascript
let data = {
	annotationId: 320,	// 批注的唯一标识
	coordinate: {
		drawRectScreenCoord: {
			startX: 38,
			startY: 210,
			endX: 238,
			endY: 402
		},
		drawRectWorldCoord: {
			startX: -24.88748981868235,
			startY: 26.64271682686174,
			endX: 25.490601775931857,
			endY: 48.2797488960321
		},
		type: "drawCloudType"
	}
}
```
或
```javascript
let data = annotationId || elementId || modelId
let config = {
	showCenter: false,		// 是否定位到屏幕中央, 默认: false
	showColor: '#00ff00'	// 闪烁的颜色值, 默认: #00ff00
}
```
* 调用接口
```javascript
cadCanvas.selectedDxfAnnotationCtrl(data, config)
```
* 注：data可直接传入批注id或者modelId, config不是必传参数

----

###### 传入坐标位置定位到屏幕中央：
* 调用接口
```javascript
cadCanvas.moveToScreenPositionCtrl(x, y)
```

----

###### 初始化完成的返回数据：
* 注：只有初始化完成之后才可以进行批注的增删改查等操作，其中的100.00代表的是初始化的进度到了100%
* 数据格式
```javascript
let data = {
	data: 100.00,
	type: "sceneAddFinishDxf"
}
```

----

###### 批注绘制完成的返回数据：
绘制矩形框：`drawRectType`
绘制云线框：`drawCloudType`
绘制平面框：`drawPlaneType`
绘制箭头：`drawArrowType`
绘制椭圆：`drawEllipseType`
* 数据格式
```javascript
let data = {
	data: {},	// 和查询批注列表里面的coordinate字段的数据要保持同步
	type: "selectedComponentDxf"
}
```

----

###### 移动缩放之后的返回数据：
* 数据格式
```javascript
let data = {
	data: {
		moveAndZoom: {
			offsetX: 0,		// X轴偏移量
			offsetY: 0,		// Y轴偏移量
			zoom: 1			// 画布缩放大小，1为不放大也没缩小
		}
	},
	type: "updateScreenPositionDxf"
}
```
* 注：zoom的值是相对于左上角(0,0)为基点进行缩放的

----

###### 重新计算当前批注的屏幕位置：
* 数据格式
```javascript
let data = [{
	coordinate: {
		drawRectScreenCoord: {
			startX: 38,
			startY: 210,
			endX: 238,
			endY: 402
		},
		drawRectWorldCoord: {
			startX: -24.88748981868235,
			startY: 26.64271682686174,
			endX: 25.490601775931857,
			endY: 48.2797488960321
		},
		type: "drawCloudType"
	},	// 还是之前第一次保存之后的callback数据
}]
```
* 或者直接传入data[0]也可以，只不过传进去什么格式，返回什么格式
* 调用接口
```javascript
cadCanvas.pointToScreenPositionCtrl(data, (callback) => {
	console.log(callback)
})
```

----

###### 新绘制的批注框与原来绘制的批注框的type都是selectedComponentDxf：
* 新绘制的批注框的callback数据格式
```javascript
let data = {
	type: "selectedComponentDxf",
	data: {
		drawRectScreenCoord: {
			startX: 38,
			startY: 210,
			endX: 238,
			endY: 402
		},
		drawRectWorldCoord: {
			startX: -24.88748981868235,
			startY: 26.64271682686174,
			endX: 25.490601775931857,
			endY: 48.2797488960321
		},
		type: "drawCloudType"	// 根据这个type判断是新增批注框，以及批注框的形状
	}
}
```
* 点击之前绘制的批注框的callback数据格式
```javascript
let data = {
	type: "selectedComponentDxf"
	data: {
		name: 341,	// 返回点选的批注框的唯一标识
		type: "Line",
		userData: {
			drawRectScreenCoord: {
				startX: 38,
				startY: 210,
				endX: 238,
				endY: 402
			},
			drawRectWorldCoord: {
				startX: -24.88748981868235,
				startY: 26.64271682686174,
				endX: 25.490601775931857,
				endY: 48.2797488960321
			},
			type: "drawCloudType"	// 根据这个type判断是点选的批注框，以及选中的批注框的形状
		}
	}
}
```

* eg: data.data.type === 'drawCloudType'  // 如果取到对应值，则代表新增
* eg: data.data.userData.type === 'drawCloudType'  // 如果取到对应值，则代表点选

----

###### 每次新增之后操作：
* 第一步：保存数据库
* 第二步：保存成功之后，再按照数据规则调用第二个接口：cadCanvas.dxfAnnotationListDrawCtrl(data)
* 第三步：如果未点击保存，或者保存未成功，则需要调用刷新的接口为：cadCanvas.render()

----

###### 手指抬起的callback数据格式：
```javascript
let data = {
	type: "touchendDxf",
	data: {}
}
```

----

###### 修改绘制颜色值：
* 调用接口
```javascript
cadCanvas.changeRoleColorCtrl('#00ff00')
```
* 注：传入的颜色值格式为十六进制颜色模式

----

###### 回归主视图 (重置视角)：
* 调用接口
```javascript
cadCanvas.resetCameraCtrl()
```

----

###### 修改显示窗口大小：
* 调用接口
```javascript
cadCanvas.resetCameraCtrl(width, height)
```

----

###### 传入缩放值：
* 调用接口
```javascript
cadCanvas.zoomCameraCtrl(1)
```
* 注：1为既不放大也不缩小
* 注：传入的值要为number类型的
* 注：和type=updateScreenPositionDxf的返回缩放值保持一致

----

###### 删除canvas节点：
* 调用接口
```javascript
cadCanvas.deleteCurrentNodeCtrl()
```

----

###### 手动关闭批注绘制开关：
* 调用接口
```javascript
cadCanvas.closeDrawCtrl()
```




### 移动端只使用批注这部分的功能的使用例子

```javascript
// cad-view代表的是你插入dxf的节点id，width代表显示时的宽，height代表显示时的高
let cadCanvas = new Viewer({}, document.getElementById('cad-view'), width, height, {}, (dxfCallback) => {
	console.log(dxfCallback, '用户操作之后的回调函数')
})

// 如若切换的下面为图片，则需要这样调用，并且下方图片一定要根据canvas的宽高比动态居中全部显示出来
cadCanvas.sceneAddDataCtrl({}, {
	width: canvas宽度,
	height: canvas高度,
	imageWidth: 下方需要批注的图片的宽度,
	imageHeight: 下方需要批注的图片的高度
})

// 如若之后再修改屏幕的宽高
cadCanvas.resetCameraCtrl(width, height, imageWidth, imageHeight)
```


### 移动端操作方式说明
1，单指表示平移(如果打开批注，则为绘制)
2，双指表示缩放(如果打开批注，则不允许缩放)
3，三指表示平移


###### 特殊情况说明：
* 引用方式：`<script src="https://cdn.jsdelivr.net/npm/view-dxf@1.2.0/dist/index.js" type="text/javascript" charset="utf-8"></script>`
* 最新的包：`<script src="https://cdn.jsdelivr.net/npm/view-dxf@latest/dist/index.js" type="text/javascript" charset="utf-8"></script>`
* 引用方式：`import Viewer from 'view-dxf'`
* 打包方式：webpack --config webpack.config.js
* 发布方式：npm publish
* 更新方式：npm update view-dxf --save
