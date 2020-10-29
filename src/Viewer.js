
/**
 * 注释:
 * 1,OrbitControls.js 		轨道控制器来控制场景的旋转、平移，缩放
 * 2,LineControls.js  		鼠标点击事件的操作控制器
 * 3,DragControls.js  		拖拽控件
 * 4,StateMachine.js		有限状态机，一个简单的实用程序，可让您定义状态和操作以在它们之间进行转换。
 * 5,viewDxf.js				Three-Dxf是一个浏览器dxf文件查看器应用，其使用dxf-parser解析dxf文件（解析出json格式），并使用three.js来渲染。
 * 6,Three.js
 */

import * as THREE from 'three'
import OrbitControls from './OrbitControls.js'
import LineControls from './LineControls.js'
import typeface from './typeface.json'



// Three.js extension functions. Webpack doesn't seem to like it if we modify the THREE object directly.
var THREEx = { Math: {} };
/**
 * Returns the angle in radians of the vector (p1,p2). In other words, imagine
 * putting the base of the vector at coordinates (0,0) and finding the angle
 * from vector (1,0) to (p1,p2).
 * @param  {Object} p1 start point of the vector
 * @param  {Object} p2 end point of the vector
 * @return {Number} the angle
 */
THREEx.Math.angle2 = function(p1, p2) {
	var v1 = new THREE.Vector2(p1.x, p1.y);
	var v2 = new THREE.Vector2(p2.x, p2.y);
	v2.sub(v1); // sets v2 to be our chord
	v2.normalize();
	if(v2.y < 0) return -Math.acos(v2.x);
	return Math.acos(v2.x);
};


THREEx.Math.polar = function(point, distance, angle) {
	var result = {};
	result.x = point.x + distance * Math.cos(angle);
	result.y = point.y + distance * Math.sin(angle);
	return result;
};

/**
 * Calculates points for a curve between two points
 * @param startPoint - the starting point of the curve
 * @param endPoint - the ending point of the curve
 * @param bulge - a value indicating how much to curve
 * @param segments - number of segments between the two given points
 */
THREEx.BulgeGeometry = function ( startPoint, endPoint, bulge, segments ) {

	var vertex, i,
		center, p0, p1, angle,
		radius, startAngle,
		thetaAngle;

	THREE.Geometry.call( this );

	this.startPoint = p0 = startPoint ? new THREE.Vector2(startPoint.x, startPoint.y) : new THREE.Vector2(0,0);
	this.endPoint = p1 = endPoint ? new THREE.Vector2(endPoint.x, endPoint.y) : new THREE.Vector2(1,0);
	this.bulge = bulge = bulge || 1;

	angle = 4 * Math.atan(bulge);
	radius = p0.distanceTo(p1) / 2 / Math.sin(angle/2);
	center = THREEx.Math.polar(startPoint, radius, THREEx.Math.angle2(p0,p1) + (Math.PI / 2 - angle/2));

	this.segments = segments = segments || Math.max( Math.abs(Math.ceil(angle/(Math.PI/18))), 6); // By default want a segment roughly every 10 degrees
	startAngle = THREEx.Math.angle2(center, p0);
	thetaAngle = angle / segments;


	this.vertices.push(new THREE.Vector3(p0.x, p0.y, 0));

	for(i = 1; i <= segments - 1; i++) {

		vertex = THREEx.Math.polar(center, Math.abs(radius), startAngle + thetaAngle * i);

		this.vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0));

	}

};

THREEx.BulgeGeometry.prototype = Object.create( THREE.Geometry.prototype );
    
/**
 * Viewer class for a dxf object.
 * @param {Object} data - the dxf object
 * @param {Object} parent - the parent element to which we attach the rendering canvas
 * @param {Number} width - width of the rendering canvas in pixels
 * @param {Number} height - height of the rendering canvas in pixels
 * @param {Object} font - a font loaded with THREE.FontLoader 
 * @constructor
 */

// 问题类型
let questionTypeList = [{label: "一般问题", value: 1}, {label: "严重问题", value: 2}]
// 修改的dxf图纸的线框颜色
let dxfLineTextColor = ['#000000', '#FF0000']
// 右下角的标号的字体颜色
let markNumberColor = '#FFFFFF'

function Viewer(data, parent, width, height, font, dxfCallback) {
	
	// 全局this
	let scope = this
	// step
	let ZONE_ENTITIES = 50
	// viewPort
	let viewPort = {}
	// setTimeout
	let moveTimeOut = {}
	let selectTimeOut = {}
	// 记录宽高
	let recordWidth = width
	let recordHeight = height
	// 记录切换图纸之后内存占用的次数
	let loadDxfRetry = 1
	let maxTryNumber = 1
	// block缓存
	let blockData = {}
	// 已添加的modelId
	let alreadyHaveModelIdData = {}
	let alreadyHaveModelIdArr = []
	// 黑色材质
	let material = new THREE.MeshBasicMaterial({ color: dxfLineTextColor[0] });
	// 红色材质
	let redMaterial = new THREE.MeshBasicMaterial({ color: dxfLineTextColor[1] });
	
    createLineTypeShaders(data);

    var scene = new THREE.Scene();

    // Create scene from dxf object (data)
    var entity, obj, min_x, min_y, min_z, max_x, max_y, max_z;
    var dims = {
        min: { x: false, y: false, z: false},
        max: { x: false, y: false, z: false}
    };
    
    var camera = initCamera(width, height);
    var renderer = this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(width, height);
    //设置背景色与透明度
    renderer.setClearColor(0xFFFFFF, 0);

    renderer.domElement.id = 'dxfCanvasId';

    parent.appendChild(renderer.domElement);
    parent.style.display = 'block';

    //TODO: Need to make this an option somehow so others can roll their own controls.
    var controls = new OrbitControls(camera, parent,scene,dxfCallback);
    controls.target.x = camera.position.x;
    controls.target.y = camera.position.y;
    controls.target.z = 0;
    controls.zoomSpeed = 3;
	
	let roleColorValue = '#0A86FF'			// 绘制的默认颜色
	let highlightColorValue = '#00ff00'		// 高亮颜色值
	
    var LineControl = new LineControls(camera,parent,scene,width,height,controls,roleColorValue,dxfCallback);
    LineControl.LineRender(renderer);
    // LineControls记录最大与最小的坐标
    LineControl.changeLineControls(dims, recordWidth, recordHeight)

    //window.addEventListener("resize",this.resize);
    //Uncomment this to disable rotation (does not make much sense with 2D drawings).
    //controls.enableRotate = false;

    this.render = function() { renderer.render(scene, camera) };
    controls.addEventListener('change', this.render);
    
    // OrbitControls记录最大与最小的坐标
    controls.changeOrbitControls(dims, width, height)
    
    controls.update();
    
    this.render();
    
    if (!font || !(font.type)) {
    	font = new THREE.Font(typeface)
    }
    
    setTimeout(() => {
    	if (data && data.entities && data.entities.length > 0) {
    		// 场景添加对象
    		mergeDxfBlockLine()
    	} else {
    		// 场景添加进度(结束)
    		dxfCallback({
				type: 'sceneAddFinishDxf',
				data: 100.00
			})
    		// 全部加载完毕，开始计算缩放初始值
    		controls.updateScreenPosition('sceneAddFinishDxf')
    	}
    }, 100)
    
    function mergeDxfBlockLine () {
    	// 合并block里面的所有线
    	for (let key in data.blocks) {
    		if (data.blocks.hasOwnProperty(key) === true) {
    			if (data.blocks[key].entities && data.blocks[key].entities.length > 0) {
    				let entitiesLineFirst = ''
    				let indexArr = []
    				data.blocks[key].entities.forEach((item,index) => {
    					if (entitiesLineFirst && item.type === 'LINE') {
		    				entitiesLineFirst.vertices = entitiesLineFirst.vertices.concat(item.vertices)
    						indexArr.unshift(index)
    					}
    					if (!entitiesLineFirst && item.type === 'LINE') {
    						entitiesLineFirst = item
    					}
    				})
    				indexArr.forEach((item,index) => {
    					data.blocks[key].entities.splice(item)
    				})
    			}
    		}
    	}
    	
    	// 记录重复的modelId数据
    	data.entities.forEach((item,index) => {
    		if (item.type == 'LINE' && item.extendedData && item.extendedData.customStrings && item.extendedData.customStrings[0]) {
    			if (alreadyHaveModelIdData[item.extendedData.customStrings[0]]) {
    				alreadyHaveModelIdData[item.extendedData.customStrings[0]].push(index)
    			} else {
    				alreadyHaveModelIdData[item.extendedData.customStrings[0]] = [index]
    			}
            }
    	})
    	
    	// 合并重复的modelId数据
    	for (let key in alreadyHaveModelIdData) {
    		let startIndex = 0
    		alreadyHaveModelIdData[key].forEach((item,index) => {
    			if (index > 0) {
    				let a = data.entities[item].vertices[0]
    				let b = data.entities[item].vertices[1]
    				if (a.x != b.x || a.y != b.y) {
    					data.entities[startIndex].vertices = data.entities[startIndex].vertices.concat(data.entities[item].vertices)
    				}
    			} else {
    				startIndex = item
    			}
    		})
    	}
    	
    	sceneAddObject(data, 0)
    }
    
    // 场景添加对象
    function sceneAddObject (data, sign) {
    	let maxI = (sign + ZONE_ENTITIES) > data.entities.length ? data.entities.length : (sign + ZONE_ENTITIES)
    	for(let i = sign; i < maxI; i++) {
	        entity = data.entities[i];
			
			// 过滤重复的modelId数据
			if (entity.type == 'LINE' && entity.extendedData && entity.extendedData.customStrings && entity.extendedData.customStrings[0]) {
				let find = alreadyHaveModelIdArr.find(el => el == entity.extendedData.customStrings[0])
				if (find) {
					continue
				} else{
					alreadyHaveModelIdArr.push(entity.extendedData.customStrings[0])
				}
            }
			
	        if(entity.type === 'DIMENSION') {
	        	// 标尺
	        	scene.add(drawEntity(entity, data));
	            if(entity.block) {
	                var block = data.blocks[entity.block];
	                if(!block) {
	                    console.error('Missing referenced block "' + entity.block + '"');
	                    continue;
	                }
	                for(var j = 0; j < block.entities.length; j++) {
	                    let bName = entity.block + j;
			        	if (!blockData[bName]) {
			        		blockData[bName] = drawEntity(block.entities[j], data);
			        	}
			        	if (blockData[bName]) {
			        		obj = blockData[bName].clone();
			        	}
	                    // obj = drawEntity(block.entities[j], data);
	                }
	            } else {
	                console.log('WARNING: No block for DIMENSION entity');
	            }
	        } else {
	            obj = drawEntity(entity, data);
	        }
	
	        if (obj) {
	            var bbox = new THREE.Box3().setFromObject(obj);
	            if (bbox.min.x && ((dims.min.x === false) || (dims.min.x > bbox.min.x))) dims.min.x = bbox.min.x;
	            if (bbox.min.y && ((dims.min.y === false) || (dims.min.y > bbox.min.y))) dims.min.y = bbox.min.y;
	            if (bbox.min.z && ((dims.min.z === false) || (dims.min.z > bbox.min.z))) dims.min.z = bbox.min.z;
	            if (bbox.max.x && ((dims.max.x === false) || (dims.max.x < bbox.max.x))) dims.max.x = bbox.max.x;
	            if (bbox.max.y && ((dims.max.y === false) || (dims.max.y < bbox.max.y))) dims.max.y = bbox.max.y;
	            if (bbox.max.z && ((dims.max.z === false) || (dims.max.z < bbox.max.z))) dims.max.z = bbox.max.z;
	           
	            // 添加模型中的uuid，以便于后期操作中的模型与图纸的联动
	            if (entity.extendedData && entity.extendedData.customStrings && entity.extendedData.customStrings[0]) {
	            	obj.userData.modelUUID = entity.extendedData.customStrings[0]
	            	obj.name = entity.extendedData.customStrings[0] + ''
	            }
				scene.add(obj);
	        }
	        if(obj && obj.type === 'Mesh'){
				obj.geometry.dispose()
				obj.material.dispose()
		    }
	        obj = null;
	    }
    	
    	scope.resetCameraCtrl(recordWidth, recordHeight)
    	
    	// chrome(64位允许使用的最大内存为4G, 32位允许使用的最大内存为1G)
    	if (window.performance && window.performance.memory && window.performance.memory.jsHeapSizeLimit) {
    		let jsHeapSizeLimit = parseInt(window.performance.memory.jsHeapSizeLimit / 1024 / 1024)
    		let totalJSHeapSize = parseInt(window.performance.memory.totalJSHeapSize / 1024 / 1024)
    		let usedJSHeapSize = parseInt(window.performance.memory.usedJSHeapSize / 1024 / 1024)
    		let residue = parseInt((jsHeapSizeLimit - totalJSHeapSize).toFixed(2))
    		console.log(usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit, residue, Number(((maxI / data.entities.length) * 100).toFixed(2)))
    		if (totalJSHeapSize > (jsHeapSizeLimit - (maxTryNumber * 64 * 3))) {
    			loadDxfRetry++
    			// 尝试(maxTryNumber - 1)次之后，如果内存还未释放，则停止
    			if (loadDxfRetry > maxTryNumber) {
    				maxI = data.entities.length
    			}
    		} else {
    			loadDxfRetry = 1
    			maxTryNumber = 1
    		}
    	}
    	
    	if (maxI < data.entities.length) {
    		if (loadDxfRetry > 1) {
    			setTimeout(() => {
    				// 场景添加进度(内存不足时，尝试(maxTryNumber - 1)次)
    				dxfCallback({
    					type: 'sceneAddFinishDxf',
    					data: ((maxI / data.entities.length) * 100).toFixed(2)
    				})
    				sceneAddObject(data, maxI)
    			}, 2000)
    		} else{
    			setTimeout(() => {
    				// 场景添加进度(正常情况下)
    				dxfCallback({
    					type: 'sceneAddFinishDxf',
    					data: ((maxI / data.entities.length) * 100).toFixed(2)
    				})
    				sceneAddObject(data, maxI)
    			}, 1)
    		}
    	} else{
    		for (let key in blockData) {
    			blockData[key] = null
    		}
    		blockData = {}
    		alreadyHaveModelIdData = {}
    		alreadyHaveModelIdArr = []
    		// 场景添加进度(结束)
			dxfCallback({
				type: 'sceneAddFinishDxf',
				data: Number(((maxI / data.entities.length) * 100).toFixed(2))
			})
			// 全部加载完毕，开始计算缩放初始值
			controls.updateScreenPosition('sceneAddFinishDxf')
    	}
    	
    }
    
    // 根据批注id单条删除dxf批注
    this.deleteDxfAnnotationCtrl = function (id) {
    	id = id + ''
    	if (scene.getObjectByName(id)) {
            scene.remove(scene.getObjectByName(id));
        }
    	if (scene.getObjectByName('type' + id)) {
            scene.remove(scene.getObjectByName('type' + id));
        }
    	if (scene.getObjectByName('content' + id)) {
            scene.remove(scene.getObjectByName('content' + id));
        }
    	if (scene.getObjectByName('markCircle' + id)) {
            scene.remove(scene.getObjectByName('markCircle' + id));
        }
    	if (scene.getObjectByName('markNumber' + id)) {
            scene.remove(scene.getObjectByName('markNumber' + id));
        }
        this.render()
    }
    
    // 删除所有的批注框
    this.deleteAllDxfAnnotationCtrl = function (list) {
    	list.forEach((item,index) => {
    		if (scene.getObjectByName(item.annotationId)) {
    			this.deleteDxfAnnotationCtrl(item.annotationId)
			}
    	})
    	this.render()
    }
    
    // 批注的显示与隐藏
    this.showAllDxfAnnotationCtrl = function (list, show) {
    	list.forEach((item,index) => {
    		let id = item
    		if (item && item.annotationId) {
    			id = item.annotationId
    		}
    		id = id + ''
    		if (scene.getObjectByName(id)) {
	            scene.getObjectByName(id).material.visible = show;
	        }
	    	if (scene.getObjectByName('type' + id)) {
	            scene.getObjectByName('type' + id).material.visible = show;
	        }
	    	if (scene.getObjectByName('content' + id)) {
	            scene.getObjectByName('content' + id).material.visible = show;
	        }
	    	if (scene.getObjectByName('markCircle' + id)) {
	            scene.getObjectByName('markCircle' + id).material.visible = show;
	        }
	    	if (scene.getObjectByName('markNumber' + id)) {
	            scene.getObjectByName('markNumber' + id).material.visible = show;
	        }
    	})
    	this.render()
    }
    
    // 修改绘制颜色
    this.changeRoleColorCtrl = function (value) {
    	roleColorValue = value
    	LineControl.changeLineControls(dims, recordWidth, recordHeight, '', '', '', roleColorValue)
	    LineControl.LineRender(this.renderer);
    }
    
    // 添加dxf批注
    this.dxfAnnotationListDrawCtrl = function (list) {
    	list.forEach((item,index) => {
    		if (scene.getObjectByName(item.annotationId)) {
    			this.deleteDxfAnnotationCtrl(item.annotationId)
    		}
    		if (!(scene.getObjectByName(item.annotationId))) {
    			// 绘制图形
    			LineControl.drawRectInitData(item)
    			
    			// 绘制标号背景
    			LineControl.drawCircleBox(item)
    			if (!item.markNumber) {
    				item.markNumber = index + 1
    			}
    			// 绘制标号
    			scene.add(drawMarkNumber(item))
    			
    			if (item.type) {
    				scene.add(drawAnnotationTextType(item))
    			}
    			if (item.content) {
    				scene.add(drawAnnotationText(item))
    			}
			}
    	})
    	this.render()
    }
    
    // 绘制标号数字
    function drawMarkNumber(entity){
    	let geometry, text;
    	let str = entity.markNumber + '';
        if(!font)
            return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');
        geometry = new THREE.TextBufferGeometry(str, { font: font, height: 2, size: 2});
        let textMaterial = new THREE.MeshBasicMaterial({ color: markNumberColor });
        text = new THREE.Mesh(geometry, textMaterial);
        let x = geometry.boundingSphere ? (geometry.boundingSphere.radius / 2) : str.length * 0.7;
        text.position.x = entity.coordinate.drawRectWorldCoord.endX - x;
        text.position.y = entity.coordinate.drawRectWorldCoord.endY - 1;
        text.position.z = entity.z || 0;
        text.name = 'markNumber' + entity.annotationId;
        return text;
    }
    
    // 绘制问题类型
    function drawAnnotationTextType(entity) {
        let geometry, text;
        let findQuestion = questionTypeList.find(el => el.value == entity.type);
        let str = findQuestion.label;
        if(!font)
            return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');
        geometry = new THREE.TextBufferGeometry(str, { font: font, height: 1, size: 1});
        let textMaterial = new THREE.MeshBasicMaterial({ color: entity.roleColor || roleColorValue });
        text = new THREE.Mesh(geometry, textMaterial);
        text.position.x = entity.coordinate.drawRectWorldCoord.startX;
        text.position.y = entity.coordinate.drawRectWorldCoord.startY - 1.1;
        text.position.z = entity.z || 0;
        text.name = 'type' + entity.annotationId;
        return text;
    }
    
    // 绘制问题内容
    function drawAnnotationText(entity) {
        let geometry, text;
        if(!font)
            return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');
        geometry = new THREE.TextBufferGeometry(entity.content, { font: font, height: 1, size: 1});
        let textMaterial = new THREE.MeshBasicMaterial({ color: entity.roleColor || roleColorValue });
        text = new THREE.Mesh(geometry, textMaterial);
        text.position.x = entity.coordinate.drawRectWorldCoord.startX;
        text.position.y = entity.coordinate.drawRectWorldCoord.startY - 2.3;
        text.position.z = entity.z || 0;
        text.name = 'content' + entity.annotationId;
        return text;
    }
    
    // 外部调用接口-返回当前世界坐标所对应的屏幕坐标
    this.pointToScreenPositionCtrl = function (list, callback) {
    	if (Object.prototype.toString.call(list) === "[object Array]") {
			list.forEach((item,index) => {
				item = pointToScreenPosition(item)
	    	})
	    } else if(Object.prototype.toString.call(list)==='[object Object]'){
	    	list = pointToScreenPosition(list)
	    } else{
	    	dxfCallback({
				type: 'messageInfoDxf',
				data: '传入的数据格式不对，请重新按照开发文档整理数据格式！'
			})
	    }
    	callback(list)
    }
    
    function pointToScreenPosition(item){
    	let start = {
			x: item.coordinate.drawRectWorldCoord.startX,
			y: item.coordinate.drawRectWorldCoord.startY,
			z: 0
		}
		let end = {
			x: item.coordinate.drawRectWorldCoord.endX,
			y: item.coordinate.drawRectWorldCoord.endY,
			z: 0
		}
		let screenValue = {
			minCoordinate: dims.min,
			maxCoordinate: dims.max,
			canvasWidth: recordWidth,
			canvasHeight: recordHeight
		}
		item.coordinate.drawRectScreenCoord.startX = controls.pointToScreenPosition(start, screenValue).x
		item.coordinate.drawRectScreenCoord.startY = controls.pointToScreenPosition(start, screenValue).y
		item.coordinate.drawRectScreenCoord.endX = controls.pointToScreenPosition(end, screenValue).x
		item.coordinate.drawRectScreenCoord.endY = controls.pointToScreenPosition(end, screenValue).y
    	return item
    }
    
    // 外部调用接口-返回绘制面积，距离，角度，周长
    this.commonDxfDrawEvent = function (type, callback) {
    	LineControl.commonDxfDrawEvent(type, callback)
    }
	
	// 外部修改缩放值
	this.zoomCameraCtrl = function (value) {
		if (value > 0) {
			let scale = 1 / value
	    	camera.top = viewPort.top * scale;
	        camera.bottom = viewPort.bottom * scale;
	        camera.left = viewPort.left * scale;
	        camera.right = viewPort.right * scale;
	        camera.updateProjectionMatrix();
	        controls.update()
	        this.render()
		}
    }
	
	// 通用批注新增方法，手动控制批注绘制开关
    this.closeDrawCtrl = function () {
        LineControl.closeDraw()
    }
	
	// 构件定位与高亮显示
	this.selectedDxfAnnotationCtrl = function (value, config) {
		let x = 0, y = 0, id = '', index = 0, max = 50, timeValue = 1, showColor = '', queryData = {}, roleColor = dxfLineTextColor[0];
		if (value.annotationId) {
			id = value.annotationId
		} else {
			id = value + ''
		}
		id = id + ''
		queryData = scene.getObjectByName(id)
		if (config && config.showColor) {
			showColor = config.showColor
		}
		if (config && config.showCenter) {
			if (value.coordinate) {
				x = (value.coordinate.drawRectWorldCoord.startX + value.coordinate.drawRectWorldCoord.endX) / 2
				y = (value.coordinate.drawRectWorldCoord.startY + value.coordinate.drawRectWorldCoord.endY) / 2
			} else {
				if (queryData && queryData.geometry) {
					x = queryData.geometry.boundingSphere.center.x
					y = queryData.geometry.boundingSphere.center.y
				} else {
					dxfCallback({
						type: 'messageInfoDxf',
						data: '当前图纸未找到对应构件！'
					})
					return false;
				}
			}
			let selectedObj = {
				startPoint: camera.position,
				middlePoint: {
					x: (x + camera.position.x) / 2,
					y: (y + camera.position.y) / 2,
					z: 0
				},
				endPoint: {
					x: x,
					y: y,
					z: 0
				}
			}
			let points = LineControl.getBezierCurvePoint(selectedObj)
			clearInterval(moveTimeOut)
			clearTimeout(selectTimeOut)
			moveTimeOut = setInterval(() => {
				camera.position.set(points[index].x, points[index].y, camera.position.z)
				camera.lookAt(new THREE.Vector3(points[index].x, points[index].y, camera.position.z))
				controls.target = points[index]
				controls.update()
				this.render()
				index++
				if(index >= max){
					clearInterval(moveTimeOut)
				}
			}, timeValue)
		} else {
			max = 0
		}
		selectTimeOut = setTimeout(() => {
			if (queryData && queryData.material) {
				let color = queryData.material.color
				let sRgb = 'RGB(' + color.r * 255 + ',' + color.g * 255 + ',' + color.b * 255 + ')'
				roleColor = colorRGBtoHex(sRgb)
				blinkAnnotationCtrl(id, roleColor, showColor)
			} else {
				dxfCallback({
					type: 'messageInfoDxf',
					data: '当前图纸未找到对应构件！'
				})
				return false;
			}
		}, max * timeValue * 30)
	}
	
	// 闪烁选中的矩形框
    function blinkAnnotationCtrl (id, roleColor, showColor) {
    	for (let i = 0; i < 6; i++) {
    		setTimeout(() => {
    			if (parseInt(i%2) > 0) {
    				scene.getObjectByName(id).material.color.set( roleColor || roleColorValue )
    				scope.render()
    			} else {
    				scene.getObjectByName(id).material.color.set( showColor || highlightColorValue )
    				scope.render()
    			}
    		}, i * 200)
    	}
    }
	
	
	
	// 根据图纸对应的屏幕坐标的最小点与最大点修改相机位置
	this.changeProjectionMatrixCtrl = function (val){
		
		let dw = 1080 * recordWidth / recordHeight
		let dh = 1080
		
		let x1 = mapNumRange(0, val.minPositionx, val.maxPositionx, dims.min.x, dims.max.x)
		let x2 = mapNumRange(dw, val.minPositionx, val.maxPositionx, dims.min.x, dims.max.x)
		let dx = (x2 - x1) / 2
		let y1 = mapNumRange(0, val.minPositiony, val.maxPositiony, dims.min.y, dims.max.y)
		let y2 = mapNumRange(dh, val.minPositiony, val.maxPositiony, dims.min.y, dims.max.y)
		let dy = (y2 - y1) / 2
		
		if ((dx / dy) < dw / dh) {
			dx = dw * (dy / dh)
		} else{
			dy = dh * (dx / dw)
		}
		
		let sx = (val.minPositionx + val.maxPositionx) / 2
		let sy = (val.minPositiony + val.maxPositiony) / 2
		
		let a = 1.0
		camera.left = -dx * a
		camera.right = dx * a
		camera.top = dy * a
		camera.bottom = -dy * a
		
		let screenValue = {
			minCoordinate: dims.min,
			maxCoordinate: dims.max,
			canvasWidth: dw,
			canvasHeight: dh
		}
		let dMin = controls.pointToScreenPosition(dims.min, screenValue)
		let dMax = controls.pointToScreenPosition(dims.max, screenValue)
		let mx = (dMin.x + dMax.x) / 2
		let my = (dMin.y + dMax.y) / 2
		controls.pan(((sx - mx) * recordWidth / dw) + (val.offsetX * (1 - recordWidth / dw)), (sy - my) * recordHeight / dh)
		controls.update('modelToDxf')
	}
	function mapNumRange(num, inMin, inMax, outMin, outMax){
		return (((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin)
	}
	
	
	
	
	
	// 重置相机位置
	this.resetCameraCtrl = function (changeWidth, changeHeight, imageWidth, imageHeight) {
		if (changeWidth) {
			recordWidth = changeWidth
		}
		if (changeHeight) {
			recordHeight = changeHeight
		}
		
		if (imageWidth && imageHeight) {
			dims = {
		        min: { x: -imageWidth / 10, y: -imageHeight / 10, z: false},
		        max: { x: imageWidth / 10, y: imageHeight / 10, z: false}
		    }
		}
		
		camera = null
		camera = initCamera(recordWidth, recordHeight)
		camera.updateProjectionMatrix()
		renderer.setSize( recordWidth, recordHeight );
		
		controls.changeOrbitControls(dims, recordWidth, recordHeight, camera, parent, scene)
	    controls.target.x = camera.position.x;
	    controls.target.y = camera.position.y;
	    controls.update();
		
	    LineControl.changeLineControls(dims, recordWidth, recordHeight, camera, parent, scene)
	    LineControl.LineRender(this.renderer);
		
		this.render()
		
		controls.updateScreenPosition('sceneAddFinishDxf')
	}
	
	// 清空场景
	this.sceneRemoveViewerCtrl = function () {
		// 从scene中删除模型并释放内存
		if (scene.children.length > 0) {
			for (let i = scene.children.length - 1; i >= 0; i--) {
				var myMesh = scene.children[i]
				if (myMesh.children && myMesh.children.length>0) {
					var currObj = myMesh.children;
					for(var j = 0; j< currObj.length; j++){
						deleteGroup(currObj[j]);
					}
				}
			    if(myMesh.type === 'Mesh'){
					scene.remove(myMesh)
					myMesh.geometry.dispose()
					myMesh.material.dispose()
					myMesh = null
			    } else {
			    	scene.remove(myMesh)
			    	myMesh = null
			    }
			}
		}
		
		loadDxfRetry = 1
		maxTryNumber = 3
		this.render()
	}
	
	// 删除group，释放内存
	function deleteGroup(group) {
		//console.log(group);
		if (!group) return;
		// 删除掉所有的模型组内的mesh
		group.traverse(function (item) {
			if (item instanceof THREE.Mesh) {
				item.geometry.dispose(); // 删除几何体
				item.material.dispose(); // 删除材质
			}
		});
	}
	
	// 删除画布节点
	this.deleteCurrentNodeCtrl = function() {
		parent.removeChild(renderer.domElement)
	}
	
	// 切换图纸
	this.sceneAddDataCtrl = function (dxfData, widthData) {
		data = dxfData
		// 重置最大最小点
		dims = {
	        min: { x: false, y: false, z: false},
	        max: { x: false, y: false, z: false}
	    }
		
		if (widthData) {
			this.resetCameraCtrl(widthData.width, widthData.height, widthData.imageWidth, widthData.imageHeight)
		}
		
		if (data && data.entities && data.entities.length > 0) {
			clearTimeout(selectTimeOut)
			selectTimeOut = setTimeout(() => {
				mergeDxfBlockLine()
			}, 2000)
		} else{
			// 场景添加进度(结束)
    		dxfCallback({
				type: 'sceneAddFinishDxf',
				data: 100.00
			})
    		// 全部加载完毕，开始计算缩放初始值
			controls.updateScreenPosition('sceneAddFinishDxf')
		}
	}
	
    function initCamera(width, height) {
        width = width || parent.innerWidth;
        height = height || parent.innerHeight;
        var aspectRatio = width / height;

        var upperRightCorner = { x: dims.max.x || ZONE_ENTITIES, y: dims.max.y || ZONE_ENTITIES };
        var lowerLeftCorner = { x: dims.min.x || -ZONE_ENTITIES, y: dims.min.y || -ZONE_ENTITIES };
        
        // 当前的视口范围
        var vp_width = upperRightCorner.x - lowerLeftCorner.x;
        var vp_height = upperRightCorner.y - lowerLeftCorner.y;
        var center = center || {
            x: vp_width / 2 + lowerLeftCorner.x,
            y: vp_height / 2 + lowerLeftCorner.y
        };

        // 将所有对象放入当前的可视区域
        var extentsAspectRatio = Math.abs(vp_width / vp_height);
        if (aspectRatio > extentsAspectRatio) {
            vp_width = vp_height * aspectRatio;
        } else {
            vp_height = vp_width / aspectRatio;
        }

        viewPort = {
            bottom: -vp_height / 2,
            left: -vp_width / 2,
            top: vp_height / 2,
            right: vp_width / 2,
            center: {
                x: center.x,
                y: center.y
            }
        };
        
        // var camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 10000);
        // camera.lookAt(new THREE.Vector3(viewPort.center.x, viewPort.center.y, 0));
        
        var camera = new THREE.OrthographicCamera(viewPort.left, viewPort.right, viewPort.top, viewPort.bottom, 0.001, 10000);
        camera.position.z = 1000;
        camera.position.x = viewPort.center.x;
        camera.position.y = viewPort.center.y;
        return camera;
    }
    function drawEntity(entity, data) {
    	var mesh;
        if(entity.type === 'CIRCLE' || entity.type === 'ARC') {
        	// 黑色
            mesh = drawArc(entity, data);
        } else if(entity.type === 'LWPOLYLINE' || entity.type === 'LINE' || entity.type === 'POLYLINE') {
        	// 黑色(line的改了一半，带有 pattern 的是轴网-红线，不带的还是用的原来的材质)
            mesh = drawLine(entity, data);
        } else if(entity.type === 'TEXT') {
        	// 黑色
            mesh = drawText(entity, data);
        } else if(entity.type === 'SOLID') {
        	// 黑色
            mesh = drawSolid(entity, data);
        } else if(entity.type === 'POINT') {
        	// 黑色
            mesh = drawPoint(entity, data);
        } else if(entity.type === 'INSERT') {
            mesh = drawBlock(entity, data);
        } else if(entity.type === 'SPLINE') {
        	// 黑色
            mesh = drawSpline(entity, data);
        } else if(entity.type === 'MTEXT') {
        	// 黑色
            mesh = drawMtext(entity, data);
        } else if(entity.type === 'DIMENSION') {
        	// 黑色
            mesh = drawDimension(entity, data);
        } else if(entity.type === 'ELLIPSE') {
        	// 黑色
            mesh = drawEllipse(entity, data);
        } else {
            console.log("Unsupported Entity Type: " + entity.type);
        }
        return mesh;
    }

    function drawEllipse(entity, data) {
        var color = getColor(entity, data);

        var xrad = Math.sqrt(Math.pow(entity.majorAxisEndPoint.x,2) + Math.pow(entity.majorAxisEndPoint.y,2));
        var yrad = xrad*entity.axisRatio;
        var rotation = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x);

        var curve = new THREE.EllipseCurve(
            entity.center.x,  entity.center.y,
            xrad, yrad,
            entity.startAngle, entity.endAngle,
            false, // Always counterclockwise
            rotation
        );

        var points = curve.getPoints( 50 );
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        
        // var material = new THREE.LineBasicMaterial( {  linewidth: 1, color : dxfLineTextColor[0] || color } );

        // Create the final object to add to the scene
        var ellipse = new THREE.Line( geometry, material.clone() );
        return ellipse;
    }

    function drawMtext(entity, data) {
    	
    	// 特殊处理格式：\fArial|b0|i0|c134|p34|;1     或者     \f仿宋|b0|i0|c134|p49|;H
    	let entityText = entity.text.replace(/\\f.*;/gi, '')
    	
        var color = getColor(entity, data);
        var geometry = new THREE.TextBufferGeometry( entityText, {
            font: font,
            size: entity.height * (4/5),
            height: 1
        });
        
        // var material = new THREE.MeshBasicMaterial( {color: dxfLineTextColor[0] || color} );
        
        var text = new THREE.Mesh( geometry, material.clone() );

        // Measure what we rendered.
        var measure = new THREE.Box3();
        measure.setFromObject( text );

        var textWidth  = measure.max.x - measure.min.x;

        // If the text ends up being wider than the box, it's supposed
        // to be multiline. Doing that in threeJS is overkill.
        if (textWidth > entity.width) {
            console.log("Can't render this multipline MTEXT entity, sorry.", entity);
            return undefined;
        }

        text.position.z = 0;
        switch (entity.attachmentPoint) {
            case 1:
                // Top Left
                text.position.x = entity.position.x;
                text.position.y = entity.position.y - entity.height;
            break;
            case 2:
                // Top Center
                text.position.x = entity.position.x - textWidth/2;
                text.position.y = entity.position.y - entity.height;
            break;
            case 3:
                // Top Right
                text.position.x = entity.position.x - textWidth;
                text.position.y = entity.position.y - entity.height;
            break;

            case 4:
                // Middle Left
                text.position.x = entity.position.x;
                text.position.y = entity.position.y - entity.height/2;
            break;
            case 5:
                // Middle Center
                text.position.x = entity.position.x - textWidth/2;
                text.position.y = entity.position.y - entity.height/2;
            break;
            case 6:
                // Middle Right
                text.position.x = entity.position.x - textWidth;
                text.position.y = entity.position.y - entity.height/2;
            break;

            case 7:
                // Bottom Left
                text.position.x = entity.position.x;
                text.position.y = entity.position.y;
            break;
            case 8:
                // Bottom Center
                text.position.x = entity.position.x - textWidth/2;
                text.position.y = entity.position.y;
            break;
            case 9:
                // Bottom Right
                text.position.x = entity.position.x - textWidth;
                text.position.y = entity.position.y;
            break;

            default:
                return undefined;
        };

        return text;
    }
    
    function drawDimension(entity, data) {
    	let entityText = String(Math.round(entity.actualMeasurement))
        let geometry, text;
        let color = getColor(entity, data);
        if(!font)
            return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');
        geometry = new THREE.TextBufferGeometry(entityText, { font: font, height: 1, size: 1});
        // let material = new THREE.MeshBasicMaterial({ color: dxfLineTextColor[0] || color });
        text = new THREE.Mesh(geometry, material.clone());
        text.position.x = entity.middleOfText.x;
        text.position.y = entity.middleOfText.y;
        text.position.z = entity.middleOfText.z || 0;
        return text;
    }

    function drawSpline(entity, data) {
        var color = getColor(entity, data);

        var points = entity.controlPoints.map(function(vec) {
            return new THREE.Vector2(vec.x, vec.y);
        });

        var interpolatedPoints = [];
        
        
        var curve = {};
        
        
        if (entity.degreeOfSplineCurve === 2 || entity.degreeOfSplineCurve === 3) {
            for(var i = 0; i + 2 < points.length; i = i + 2) {
        if (entity.degreeOfSplineCurve === 2) {
                        curve = new THREE.QuadraticBezierCurve(points[i], points[i + 1], points[i + 2]);
        } else {
            curve = new THREE.QuadraticBezierCurve3(points[i], points[i + 1], points[i + 2]);
        }
                interpolatedPoints.push.apply(interpolatedPoints, curve.getPoints(50));
            }
        } else {
            curve = new THREE.SplineCurve(points);
            interpolatedPoints = curve.getPoints( 100 );
        }

        var geometry = new THREE.BufferGeometry().setFromPoints( interpolatedPoints );
        
        // var material = new THREE.LineBasicMaterial( { linewidth: 1, color : dxfLineTextColor[0] || color } );
        
        var splineObject = new THREE.Line( geometry, material.clone() );

        return splineObject;
    }

    function drawLine(entity, data) {
        var color = getColor(entity, data),
            vectorData = [], lineType, vertex;

        for(let i = 0; i < entity.vertices.length; i++) {
        	vertex = entity.vertices[i];
        	vectorData.push(new THREE.Vector3(vertex.x, vertex.y, 0));
        }
        if(entity.shape) vectorData.push(vectorData[0]);
        if(entity.lineType) {
            lineType = data.tables.lineType.lineTypes[entity.lineType];
        }
		
		let lineMaterial = null
        if(lineType && lineType.pattern && lineType.pattern.length !== 0) {
            // lineMaterial = new THREE.LineDashedMaterial({ color: color, gapSize: 4, dashSize: 4});
            lineMaterial = redMaterial.clone()
        } else {
            // lineMaterial = new THREE.LineBasicMaterial({ linewidth: 1, color: dxfLineTextColor[0] || color });
            lineMaterial = material.clone()
        }
		
		let geometry = new THREE.BufferGeometry().setFromPoints(vectorData);
        let line = new THREE.LineSegments(geometry, lineMaterial);
        return line;
    }
    
    function drawArc(entity, data) {
        var startAngle, endAngle;
        if (entity.type === 'CIRCLE') {
            startAngle = entity.startAngle || 0;
            endAngle = startAngle + 2 * Math.PI;
        } else {
            startAngle = entity.startAngle;
            endAngle = entity.endAngle;
        }

        var curve = new THREE.ArcCurve(
            0, 0,
            entity.radius,
            startAngle,
            endAngle);

        var points = curve.getPoints( 32 );
        var geometry = new THREE.BufferGeometry().setFromPoints( points );

        // var material = new THREE.LineBasicMaterial({ color: getColor(entity, data) });

        var arc = new THREE.Line(geometry, material.clone());
        arc.position.x = entity.center.x;
        arc.position.y = entity.center.y;
        arc.position.z = entity.center.z;

        return arc;
    }

    function drawSolid(entity, data) {
        var mesh, verts,
            geometry = new THREE.Geometry();

        verts = geometry.vertices;
        verts.push(new THREE.Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z));
        verts.push(new THREE.Vector3(entity.points[1].x, entity.points[1].y, entity.points[1].z));
        verts.push(new THREE.Vector3(entity.points[2].x, entity.points[2].y, entity.points[2].z));
        verts.push(new THREE.Vector3(entity.points[3].x, entity.points[3].y, entity.points[3].z));

        // Calculate which direction the points are facing (clockwise or counter-clockwise)
        var vector1 = new THREE.Vector3();
        var vector2 = new THREE.Vector3();
        vector1.subVectors(verts[1], verts[0]);
        vector2.subVectors(verts[2], verts[0]);
        vector1.cross(vector2);

        // If z < 0 then we must draw these in reverse order
        if(vector1.z < 0) {
            geometry.faces.push(new THREE.Face3(2, 1, 0));
            geometry.faces.push(new THREE.Face3(2, 3, 1));
        } else {
            geometry.faces.push(new THREE.Face3(0, 1, 2));
            geometry.faces.push(new THREE.Face3(1, 3, 2));
        }

        // let material = new THREE.MeshBasicMaterial({ color: dxfLineTextColor[0] || getColor(entity, data) });

        return new THREE.Mesh(geometry, material.clone());
        
    }

    function drawText(entity, data) {
        var geometry, text;

        if(!font)
            return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');
        
        // 特殊处理格式：\fArial|b0|i0|c134|p34|;1     或者     \f仿宋|b0|i0|c134|p49|;H
    	let entityText = entity.text.replace(/\\f.*;/gi, '')
        
        geometry = new THREE.TextBufferGeometry(entityText, { font: font, height: 0, size: entity.textHeight || 12 });

        // let material = new THREE.MeshBasicMaterial({ color: dxfLineTextColor[0] || getColor(entity, data) });

        text = new THREE.Mesh(geometry, material.clone());
        text.position.x = entity.startPoint.x;
        text.position.y = entity.startPoint.y;
        text.position.z = entity.startPoint.z;

        return text;
    }

    function drawPoint(entity, data) {
        var geometry, point;

        geometry = new THREE.Geometry();

        geometry.vertices.push(new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z));

        // TODO: could be more efficient. PointCloud per layer?

        var numPoints = 1;

        var color = getColor(entity, data);
        var colors = new Float32Array( numPoints*3 );
        colors[0] = color.r;
        colors[1] = color.g;
        colors[2] = color.b;

        geometry.colors = colors;
        geometry.computeBoundingBox();

        // let material = new THREE.PointsMaterial( { size: 0.05, vertexColors: dxfLineTextColor[0] || THREE.VertexColors } );
        
        point = new THREE.Points(geometry, material.clone());
        scene.add(point);
    }

    function drawBlock(entity, data) {
        var block = data.blocks[entity.name];
        
        if (!block.entities) return null;

        var group = new THREE.Object3D()
        
        if(entity.xScale) group.scale.x = entity.xScale;
        if(entity.yScale) group.scale.y = entity.yScale;

        if(entity.rotation) {
            group.rotation.z = entity.rotation * Math.PI / 180;
        }

        if(entity.position) {
            group.position.x = entity.position.x;
            group.position.y = entity.position.y;
            group.position.z = entity.position.z;
        }
        
        for(var i = 0; i < block.entities.length; i++) {
            let bName = entity.name + i;
        	if (!blockData[bName]) {
        		blockData[bName] = drawEntity(block.entities[i], data, group);
        	}
        	if (blockData[bName]) {
        		let cloneBlock = blockData[bName].clone();
        		group.add(cloneBlock);
        	}
            // var childEntity = drawEntity(block.entities[i], data, group);
            // if(childEntity) group.add(childEntity);
        }

        return group;
    }

    function getColor(entity, data) {
        var color = 0x000000; //default
        if(entity.color) color = entity.color;
        else if(data.tables && data.tables.layer && data.tables.layer.layers[entity.layer])
            color = data.tables.layer.layers[entity.layer].color;
            
        if(color == null || color === 0xffffff) {
            color = 0x000000;
        }
        return color;
    }

    function createLineTypeShaders(data) {
        var ltype, type;
        if(!data.tables || !data.tables.lineType) return;
        var ltypes = data.tables.lineType.lineTypes;

        for(type in ltypes) {
            ltype = ltypes[type];
            if(!ltype.pattern) continue;
            ltype.material = createDashedLineShader(ltype.pattern);
        }
    }

    function createDashedLineShader(pattern) {
        var i,
            dashedLineShader = {},
            totalLength = 0.0;

        for(i = 0; i < pattern.length; i++) {
            totalLength += Math.abs(pattern[i]);
        }

        dashedLineShader.uniforms = THREE.UniformsUtils.merge([

            THREE.UniformsLib[ 'common' ],
            THREE.UniformsLib[ 'fog' ],

            {
                'pattern': { type: 'fv1', value: pattern },
                'patternLength': { type: 'f', value: totalLength }
            }

        ]);

        dashedLineShader.vertexShader = [
            'attribute float lineDistance;',

            'varying float vLineDistance;',

            THREE.ShaderChunk[ 'color_pars_vertex' ],

            'void main() {',

            THREE.ShaderChunk[ 'color_vertex' ],

            'vLineDistance = lineDistance;',

            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

            '}'
        ].join('\n');

        dashedLineShader.fragmentShader = [
            'uniform vec3 diffuse;',
            'uniform float opacity;',

            'uniform float pattern[' + pattern.length + '];',
            'uniform float patternLength;',

            'varying float vLineDistance;',

            THREE.ShaderChunk[ 'color_pars_fragment' ],
            THREE.ShaderChunk[ 'fog_pars_fragment' ],

            'void main() {',

            'float pos = mod(vLineDistance, patternLength);',

            'for ( int i = 0; i < ' + pattern.length + '; i++ ) {',
            'pos = pos - abs(pattern[i]);',
            'if( pos < 0.0 ) {',
            'if( pattern[i] > 0.0 ) {',
            'gl_FragColor = vec4(1.0, 0.0, 0.0, opacity );',
            'break;',
            '}',
            'discard;',
            '}',

            '}',

            THREE.ShaderChunk[ 'color_fragment' ],
            THREE.ShaderChunk[ 'fog_fragment' ],

            '}'
        ].join('\n');

        return dashedLineShader;
    }

    function findExtents(scene) { 
        for(var child of scene.children) {
            var minX, maxX, minY, maxY;
            if(child.position) {
                minX = Math.min(child.position.x, minX);
                minY = Math.min(child.position.y, minY);
                maxX = Math.max(child.position.x, maxX);
                maxY = Math.max(child.position.y, maxY);
            }
        }

        return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY }};
    }

}


// Show/Hide helpers from https://plainjs.com/javascript/effects/hide-or-show-an-element-42/
// get the default display style of an element
function defaultDisplay(tag) {
    var iframe = document.createElement('iframe');
    iframe.setAttribute('frameborder', 0);
    iframe.setAttribute('width', 0);
    iframe.setAttribute('height', 0);
    document.documentElement.appendChild(iframe);

    var doc = (iframe.contentWindow || iframe.contentDocument).document;

    // IE support
    doc.write();
    doc.close();

    var testEl = doc.createElement(tag);
    doc.documentElement.appendChild(testEl);
    var display = (window.getComputedStyle ? getComputedStyle(testEl, null) : testEl.currentStyle).display
    iframe.parentNode.removeChild(iframe);
    return display;
}

// actual show/hide function used by show() and hide() below
function showHide(el, show) {
    var value = el.getAttribute('data-olddisplay'),
    display = el.style.display,
    computedDisplay = (window.getComputedStyle ? getComputedStyle(el, null) : el.currentStyle).display;

    if (show) {
        if (!value && display === 'none') el.style.display = '';
        if (el.style.display === '' && (computedDisplay === 'none')) value = value || defaultDisplay(el.nodeName);
    } else {
        if (display && display !== 'none' || !(computedDisplay == 'none'))
            el.setAttribute('data-olddisplay', (computedDisplay == 'none') ? display : computedDisplay);
    }
    if (!show || el.style.display === 'none' || el.style.display === '')
        el.style.display = show ? value || '' : 'none';
}

// helper functions
function show(el) { showHide(el, true); }
function hide(el) { showHide(el); }

// rgb to 16
function colorRGBtoHex(color) {
    var rgb = color.split(',');
    var r = parseInt(rgb[0].split('(')[1]);
    var g = parseInt(rgb[1]);
    var b = parseInt(rgb[2].split(')')[0]);
    var hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    return hex;
 }

/*
export {
    Viewer,
    defaultDisplay,
    showHide,
    show,
    hide
}
*/

export default Viewer;



