

import * as THREE from 'three'
// 暂时关闭
// import './DragControls.js'
import StateMachine from './StateMachine.js'


var mouse = { x: 0, y: 0 }, vectorRect, INTERSECTED, INTERSECTEDFIRST, INTERSECTEDLIST ;
var renderer;
var startEvent = { type: 'start'};
var endEvent = { type: 'end'};
var objects = [];//将需要拖拽的元素放进这个集合中
var pointsArray = [];
var window_mouse = true;

let LineControlsCallback = ''	// 绘制面积，距离，角度，周长的回调
let pointsArrayStr = []			// 记录当前点击的点的集合
let commonDxfDrawEventType = ''	// 记录外部操作的type
let bezierCurveLength = 2
let bezierCurveHeight = 3
let bezierCurveArr = []

// 记录角色所对应的颜色值
let roleColorData = [ '#00ff00', '#A327FF', '#00BFFF', '#FF9200', '#4BE402', '#FC0261' ]

export default function LineControls(camera,parent,scene,width,height,controls,dxfCallback) {
    var deleteLine = document.getElementById("delete");
    var listBox = document.getElementById('dxfOperateList');//获取自定义右键菜单
    var isDrawing = false;
    
    let drawRectScreenCoord = {startX: 0, startY: 0, endX: 0, endY: 0};	// 记录当前绘制的矩形的屏幕坐标
    let drawRectWorldCoord = {startX: 0, startY: 0, endX: 0, endY: 0};	// 记录当前绘制的矩形的世界坐标
    let boundingClientRect = {left: 0, top: 0};	// 记录绘制矩形时的值event.target.getBoundingClientRect()
    let screenValue = {};
    let scope = this;
    let drawBtnIdArr = ['drawRectId', 'drawCloudId', 'drawPlaneId', 'drawArrowId', 'drawLineId']

    function activate() {
    	if (deleteLine) {
    		deleteLine.addEventListener("click",deleteOneLine,false);
    	}
        parent.addEventListener( 'mousemove', onDocumentMouseMove, false );
        parent.addEventListener( 'mousedown', onDocumentMouseDown, false );
        parent.addEventListener( 'mouseup', onDocumentMouseUp, false );
        
        parent.addEventListener( 'touchstart', onDocumentMouseDown, false );
		parent.addEventListener( 'touchend', onDocumentMouseUp, false );
		parent.addEventListener( 'touchmove', onDocumentMouseMove, false );
        
        // 添加按钮的点击事件
        drawBtnIdArr.forEach((item,index) => {
        	let elementNode = document.getElementById(item)
        	if (!elementNode) {
				return true
			}
        	let elementEvent = item.slice(0, -2)
        	elementNode.onclick = function(){
		        if (elementNode.className.indexOf('off') > -1){
		        	// elementNode.innerText = "开启啦"
		        	elementNode.classList.remove('off')
					elementNode.classList.add('on')
		            fsm[elementEvent]()
		        } else {
		        	// elementNode.innerText = "关闭啦"
		        	elementNode.classList.remove('on')
					elementNode.classList.add('off')
		            fsm.highlight();
		        }
		    }
        })
    }

    /**
     * highlight :默认状态
     * selected ：选中对象状态
     * drawingLine ：绘制直线状态
     */
    var fsm = new StateMachine({
        init: 'highlight',
        transitions: [
            { name: 'highlight',	from: '*',	to: 'highlight'		},
            { name: 'select',		from: '*',	to: 'selected'		},
            { name: 'drawLine',		from: '*',	to: 'drawingLine'	},
            { name: 'drawRect', 	from: '*',	to: 'drawingRect'	},
            { name: 'drawCloud', 	from: '*',	to: 'drawingCloud'	},
            { name: 'drawPlane', 	from: '*',	to: 'drawingPlane'	},
            { name: 'drawArrow', 	from: '*',	to: 'drawingArrow'	}
        ],
        methods: {
        	onBeforeTransition:function(data){
        		changeDrawingBtnState(data.transition)
        	},
            onEnterHighlight:function(){
                if (INTERSECTEDFIRST) {
                    INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                    INTERSECTEDFIRST = null;
                    renderer.render(scene,camera);
                }
            }
        }
    });

	// 改变头部按钮的颜色
	function changeDrawingBtnState(val){
		drawBtnIdArr.forEach((item,index) => {
			let elementNode = document.getElementById(item)
			if (!elementNode) {
				return true
			}
	        let elementEvent = item.slice(0, -2)
	        if (val !== elementEvent) {
	        	elementNode.classList.remove('on')
	        	elementNode.classList.add('off')
	        }
		})
	}

    function onDocumentMouseDown(e) {
    	let btnNum = e.button || 0;
        switch (fsm.state) {
            case 'highlight':
                selectObject(e);
                break;
            case 'selected':
                break;
            case 'drawingLine':
                drawLineOnClick(e);
                break;
            case 'drawingRect':
                if (btnNum == 0){
                	// 省的点击取消的时候再删除之前没有保存的批注框了
            		renderer.render(scene,camera);
                	// 记录绘制开始点屏幕坐标
                	drawRectScreenCoord.startX = event.clientX
                	drawRectScreenCoord.startY = event.clientY
                    vectorRect = getIntersects(e);
                    isDrawing = true;
                }
                break;
            case 'drawingCloud':
                if (btnNum == 0){
                	// 省的点击取消的时候再删除之前没有保存的批注框了
            		renderer.render(scene,camera);
                	// 记录绘制开始点屏幕坐标
                	drawRectScreenCoord.startX = event.clientX
                	drawRectScreenCoord.startY = event.clientY
                    vectorRect = getIntersects(e);
                    isDrawing = true;
                }
                break;
            case 'drawingPlane':
                if (btnNum == 0){
                	// 省的点击取消的时候再删除之前没有保存的批注框了
            		renderer.render(scene,camera);
                	// 记录绘制开始点屏幕坐标
                	drawRectScreenCoord.startX = event.clientX
                	drawRectScreenCoord.startY = event.clientY
                    vectorRect = getIntersects(e);
                    isDrawing = true;
                }
                break;
            case 'drawingArrow':
                if (btnNum == 0){
                	// 省的点击取消的时候再删除之前没有保存的批注框了
            		renderer.render(scene,camera);
                	// 记录绘制开始点屏幕坐标
                	drawRectScreenCoord.startX = event.clientX
                	drawRectScreenCoord.startY = event.clientY
                    vectorRect = getIntersects(e);
                    isDrawing = true;
                }
                break;
        }
    }

    function onDocumentMouseMove(e) {
        switch (fsm.state) {
            case 'highlight': //高亮状态
                moveOnDefaultState(e);
                break;
            case 'selected':
                renderer.render( scene, camera );
                break;
            case 'drawingLine':
                drawLineOnMove(e);
                break;
            case 'drawingRect':
                drawRectangleOnMove(e);
                break;
            case 'drawingCloud':
                drawCloudOnMove(e);
                break;
            case 'drawingPlane':
                drawPlaneOnMove(e);
                break;
            case 'drawingArrow':
                drawArrowOnMove(e);
                break;
        }
    }

    function onDocumentMouseUp(event) {
        switch (fsm.state) {
            case 'highlight':
                break;
            case 'selected':
                camera.dispatchEvent( endEvent );
                fsm.highlight();
                break;
            case 'drawingLine':
                break;
            case 'drawingRect':
                drawRectangleEnd(event);
                isDrawing = false;
                break;
            case 'drawingCloud':
                drawCloudEnd(event);
                isDrawing = false;
                break;
            case 'drawingPlane':
                drawPlaneEnd(event);
                isDrawing = false;
                break;
            case 'drawingArrow':
                drawArrowEnd(event);
                isDrawing = false;
                break;
        }
    }


    /**
     * 在默认状态（高亮状态）下
     * 移动鼠标,当鼠标位于图形上时，相应的图形对象高亮显示
     * @param e
     */
    function moveOnDefaultState(e) {
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left; //x position within the element.
        var y = e.clientY - rect.top;  //y position within the element.
        mouse.x = (x / width) * 2 - 1;
        mouse.y = -(y / height) * 2 + 1;
//      var vector = new THREE.Vector3(mouse.x, mouse.y, -1);
//      vector.unproject(camera);
//      vector.applyMatrix4( camera.matrixWorldInverse );
        var ray = new THREE.Raycaster();
        ray.setFromCamera( mouse, camera );
        var intersects = ray.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            if (intersects[0].object != INTERSECTED && intersects[0].object != INTERSECTEDFIRST) {
                //鼠标的变换
                document.body.style.cursor='pointer';
                /*intersects[ 0 ].object.material.transparent=true;//透明度的变化
                intersects[ 0 ].object.material.opacity=0.5;*/
                if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                INTERSECTED = intersects[0].object;
                INTERSECTED.currentHex = INTERSECTED.material.color.getHex();//记录当前选择的颜色
                //改变物体的颜色(红色)
                
                /*
                if (INTERSECTEDLIST && INTERSECTEDLIST.length>0) {
                	INTERSECTEDLIST.forEach((item,index) => {
                		INTERSECTEDLIST[index].object.material.color.set( roleColorData[0] );
                	})
                }
                INTERSECTEDLIST = intersects
                INTERSECTEDLIST.forEach((item,index) => {
                	INTERSECTEDLIST[index].object.material.color.set( roleColorData[0] );
                })
                */
                
                intersects[0].object.material.color.set( roleColorData[0] );
                
                renderer.render(scene, camera);
            }
        } else {
            document.body.style.cursor= 'auto';
            if (!INTERSECTEDFIRST){
                if (INTERSECTED) {
                    INTERSECTED.material.color.set(INTERSECTED.currentHex);//恢复选择前的默认颜色
                    INTERSECTED = null;
                    renderer.render(scene, camera);
                    //parent.removeEventListener( 'mousedown', onMouseDown, false );
                }
            }else {
                if (INTERSECTEDFIRST != INTERSECTED){
                    if (INTERSECTED){
                        INTERSECTED.material.color.set(INTERSECTED.currentHex);//恢复选择前的默认颜色
                        INTERSECTED = null;
                        renderer.render(scene, camera);
                    }
                }
            }
            if (window_mouse == true){
            }
            /*
            if (INTERSECTEDLIST && INTERSECTEDLIST.length>0) {
            	INTERSECTEDLIST.forEach((item,index) => {
                	INTERSECTEDLIST[index].object.material.color.set( roleColorData[0] );
                })
            	INTERSECTEDLIST = []
            }
            */
        }
    }

    /**
     * 点击鼠标左键
     * 选中某个对象，比如线条、矩形
     * @param e
     */
    function selectObject(e) {
        var btnNum = e.button;
        if (btnNum == 0){
            e.preventDefault();
            var rect = e.target.getBoundingClientRect();
            var x = e.clientX - rect.left; //x position within the element.
            var y = e.clientY - rect.top;  //y position within the element.
            mouse.x = (x / width) * 2 - 1;
            mouse.y = -(y / height) * 2 + 1;
//          var vector = new THREE.Vector3(mouse.x, mouse.y, -1);
//          vector.unproject(camera);
//          vector.applyMatrix4( camera.matrixWorldInverse );
            var ray = new THREE.Raycaster();
            ray.setFromCamera( mouse, camera );
            var intersects = ray.intersectObjects(scene.children, true);
			
            sendSelectedModelId(JSON.parse(JSON.stringify(intersects)))
			
            if (intersects.length > 0) {
                if (INTERSECTEDFIRST != intersects[0].object){
                    if (INTERSECTEDFIRST){
                        INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                        // INTERSECTEDFIRST.material.opacity = 1.0;
                    }
                    INTERSECTEDFIRST = INTERSECTED;
                    INTERSECTED = null;
                    //改变物体的颜色
                    intersects[0].object.material.color.set( roleColorData[0] );
                    if (objects.length > 0){
                        objects.pop();
                    }
                    objects.push(INTERSECTEDFIRST);
                    
                    // 暂时关闭鼠标选中拖动事件
                    /*
                    var dragControls = new THREE.DragControls( objects, camera, renderer.domElement );
                    dragControls.addEventListener( 'dragstart', function ( event ) { controls.enabled = false; } );
                    dragControls.addEventListener( 'dragend', function ( event ) { controls.enabled = true; } );
                    dragControls.onDocumentMouseDown(e);
                    */

                    camera.dispatchEvent( startEvent );
                    fsm.select();
                    renderer.render(scene, camera);
                }
            }else {
                if (INTERSECTEDFIRST) {
                    INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                    INTERSECTEDFIRST = null;
                }
                renderer.render(scene, camera);
            }
        }else if (btnNum == 2){

        }else {
        }
    }


    /**
     * 点击鼠标左键，开始绘制直线
     * @param e
     */
    function drawLineOnClick(e){
        var btnNum = e.button;
        if (btnNum == 0){
            var intersects = getIntersects(e);
            var vector3_x, vector3_z;
            if (!window_mouse){
                /* 依据 windwo_mouse 标识避免事件的重复添加 */
                window_mouse = true;
            }
            /* 若交点此时在平面之内则创建点（Points） */
            var pointsGeometry = new THREE.Geometry();
            //console.log("个数；" + intersects.length);
            pointsGeometry.vertices.push(intersects);
            var pointsMaterial = new THREE.PointsMaterial({color: roleColorData[0], size: 3});
            var points = new THREE.Points(pointsGeometry, pointsMaterial);
            pointsArray.push(points);
            
            

            /* 创建线段 */
            var lineGeometry = new THREE.Geometry();
            var lineMaterial = new THREE.LineBasicMaterial({color: roleColorData[0]});
			
            pointsArrayStr.push(points);
			pointsArrayStr = JSON.parse(JSON.stringify(pointsArrayStr))
			
            if (pointsArray.length >= 2) {
                lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0], pointsArray[1].geometry.vertices[0]);
                var line = new THREE.Line(lineGeometry, lineMaterial);
                pointsArray.shift();
                
                // 距离或者长度
                if (commonDxfDrawEventType === 'drawLineCallback' && LineControlsCallback) {
	            	// 外部调用绘制面积，距离，角度，周长
	            	let obj = {
	            		startX: pointsArrayStr[0].geometries[0].data.vertices[0],
	            		startY: pointsArrayStr[0].geometries[0].data.vertices[1],
	            		endX: pointsArrayStr[1].geometries[0].data.vertices[0],
	            		endY: pointsArrayStr[1].geometries[0].data.vertices[1]
	            	}
	            	LineControlsCallback(obj)
	            	setTimeout(() => {
	            		fsm.highlight();
	            		LineControlsCallback = ''
	            		pointsArrayStr = []
	            	}, 100)
	            }
                // 角度
                if (commonDxfDrawEventType === 'drawAngleCallback' && pointsArrayStr.length===3 && LineControlsCallback) {
	            	// 外部调用绘制面积，距离，角度，周长
	            	let obj = {
	            		startX: pointsArrayStr[0].geometries[0].data.vertices[0],
	            		startY: pointsArrayStr[0].geometries[0].data.vertices[1],
	            		middleX: pointsArrayStr[1].geometries[0].data.vertices[0],
	            		middleY: pointsArrayStr[1].geometries[0].data.vertices[1],
	            		endX: pointsArrayStr[2].geometries[0].data.vertices[0],
	            		endY: pointsArrayStr[2].geometries[0].data.vertices[1]
	            	}
	            	LineControlsCallback(obj)
	            	setTimeout(() => {
	            		fsm.highlight();
	            		LineControlsCallback = ''
	            		pointsArrayStr = []
	            	}, 100)
	            }
                
                line.name = 'drawRectCallback';
                scene.add(line);
                renderer.render(scene,camera);
            }
            //scene.add(points);
            renderer.render(scene,camera);
        }else if (btnNum == 2){
            /* 移除事件之后，要设置为 false 为了避免事件的重复添加 */
            window_mouse = false;
            /* 鼠标左键未点击时线段的移动状态 */
            if (scene.getObjectByName('line_move')) {
                // scene.remove(scene.getObjectByName('line_move'));
                /* 删除数组中的元素，否则的话再次重绘会链接之前的点接着重绘 */
                pointsArray.shift();
            }
            renderer.render(scene,camera);
        }
    }


    /**
     * 在绘制直线的状态下，移动鼠标，在桌面绘制直线
     * @param e
     */
    function drawLineOnMove(e) {
        var intersects = getIntersects(e);
        /* 判断交点是否在 x(-100, 100) ，z(-100, 100)(平面)之间 */

        /* 鼠标左键未点击时线段的移动状态 */
        if (scene.getObjectByName('line_move')) {
            scene.remove(scene.getObjectByName('line_move'));
        }
        /* 创建线段 */
        var lineGeometry = new THREE.Geometry();
        var lineMaterial = new THREE.LineBasicMaterial({color: roleColorData[0]});
        if (pointsArray.length > 0){
            lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0]);
            var pointsGeometry = new THREE.Geometry();
            pointsGeometry.vertices.push(intersects);
            var pointsMaterial = new THREE.PointsMaterial({color: roleColorData[0], size: 3});
            var points = new THREE.Points(pointsGeometry, pointsMaterial);
            lineGeometry.vertices.push(points.geometry.vertices[0]);
            var line = new THREE.Line(lineGeometry, lineMaterial);
            line.name = 'line_move';
            scene.add(line);
            renderer.render(scene,camera);
        }
    }
	
	// 绘制矩形框
    function drawRectangleOnMove(event){
        if (isDrawing){
            if (scene.getObjectByName('rect_move')) {
                scene.remove(scene.getObjectByName('rect_move'));
            }
            computeStartEnd(event)
            // 绘制矩形框
			drawRectBox(drawRectWorldCoord)
        }
    }
    function drawRectangleEnd(event) {
        if (isDrawing){
        	// 记录绘制矩形的结束点屏幕坐标
        	drawRectScreenCoord.endX = event.clientX
            drawRectScreenCoord.endY = event.clientY
            if (scene.getObjectByName('rect_move')) {
                scene.remove(scene.getObjectByName('rect_move'));
            }
            computeStartEnd(event)
            boundingClientRect = event.target.getBoundingClientRect();
            if (LineControlsCallback) {
            	// 外部调用绘制面积，距离，角度，周长
            	LineControlsCallback(drawRectWorldCoord)
            	drawRectBox(drawRectWorldCoord)
            	setTimeout(() => {
            		fsm.highlight();
            		LineControlsCallback = ''
            	}, 100)
            } else {
            	// 批注框选-传入屏幕坐标，后端计算
            	sendSelectedModelId([], 'drawRectType')
            }
        }
    }
    // 绘制云线框
    function drawCloudOnMove(event){
        if (isDrawing){
            if (scene.getObjectByName('cloud_move')) {
                scene.remove(scene.getObjectByName('cloud_move'));
            }
            computeStartEnd(event)
            // 绘制矩形框
			drawCloudBox(drawRectWorldCoord)
        }
    }
    function drawCloudEnd(event) {
        if (isDrawing){
        	// 记录绘制矩形的结束点屏幕坐标
        	drawRectScreenCoord.endX = event.clientX
            drawRectScreenCoord.endY = event.clientY
            if (scene.getObjectByName('cloud_move')) {
                scene.remove(scene.getObjectByName('cloud_move'));
            }
            computeStartEnd(event)
        	// 批注框选-传入屏幕坐标，后端计算
        	sendSelectedModelId([], 'drawCloudType')
        }
    }
    // 绘制平面
    function drawPlaneOnMove(event){
        if (isDrawing){
            if (scene.getObjectByName('plane_move')) {
                scene.remove(scene.getObjectByName('plane_move'));
            }
            computeStartEnd(event)
            // 绘制平面
			drawPlaneBox(drawRectWorldCoord)
        }
    }
    function drawPlaneEnd(event) {
        if (isDrawing){
        	// 记录绘制矩形的结束点屏幕坐标
        	drawRectScreenCoord.endX = event.clientX
            drawRectScreenCoord.endY = event.clientY
            if (scene.getObjectByName('plane_move')) {
                scene.remove(scene.getObjectByName('plane_move'));
            }
            computeStartEnd(event)
        	// 批注框选-传入屏幕坐标，后端计算
        	sendSelectedModelId([], 'drawPlaneType')
        }
    }
    // 绘制箭头
    function drawArrowOnMove(event){
        if (isDrawing){
            if (scene.getObjectByName('arrow_move')) {
                scene.remove(scene.getObjectByName('arrow_move'));
            }
            
            var vector = getIntersects(event);
        	drawRectWorldCoord.startX = vectorRect.x
        	drawRectWorldCoord.startY = vectorRect.y
        	drawRectWorldCoord.endX = vector.x
        	drawRectWorldCoord.endY = vector.y
        	
            // 绘制平面
			drawArrowBox(drawRectWorldCoord)
        }
    }
    function drawArrowEnd(event) {
        if (isDrawing){
        	// 记录绘制矩形的结束点屏幕坐标
        	drawRectScreenCoord.endX = event.clientX
            drawRectScreenCoord.endY = event.clientY
            if (scene.getObjectByName('arrow_move')) {
                scene.remove(scene.getObjectByName('arrow_move'));
            }
            
            var vector = getIntersects(event);
        	drawRectWorldCoord.startX = vectorRect.x
        	drawRectWorldCoord.startY = vectorRect.y
        	drawRectWorldCoord.endX = vector.x
        	drawRectWorldCoord.endY = vector.y
        	
        	// 批注框选-传入屏幕坐标，后端计算
        	sendSelectedModelId([], 'drawArrowType')
        }
    }
    
    // 记录绘制矩形的开始点与结束点的屏幕坐标所对应的世界坐标(start代表的是左上角，end代表的是右下角)
    function computeStartEnd(event){
    	/*
        // 记录绘制矩形的开始点与结束点的屏幕坐标所对应的世界坐标
        drawRectWorldCoord.startX = vectorRect.x
        drawRectWorldCoord.startY = vectorRect.y
        drawRectWorldCoord.endX = vector.x
        drawRectWorldCoord.endY = vector.y
        */
    	var vector = getIntersects(event);
        if (vectorRect.x < vector.x) {
        	drawRectWorldCoord.startX = vectorRect.x
        	drawRectWorldCoord.endX = vector.x
        } else{
        	drawRectWorldCoord.startX = vector.x
        	drawRectWorldCoord.endX = vectorRect.x
        }
        if (vectorRect.y > vector.y) {
        	drawRectWorldCoord.startY = vectorRect.y
        	drawRectWorldCoord.endY = vector.y
        } else{
        	drawRectWorldCoord.startY = vector.y
        	drawRectWorldCoord.endY = vectorRect.y
        }
    }
    
    // 根据选择的构件筛选出所有的modelId
    function filterModelIdByIntersects(intersects){
    	let arr = []
    	intersects.forEach((item,index) => {
			if (item.object && item.object.object && item.object.object.userData && item.object.object.userData.modelUUID) {
				// 点击的dxf的构件
				arr.push(item.object.object.userData.modelUUID)
			}
		})
    	return arr
    }
    // 发送所有选中的dxf构件最对应的模型id列表
    function sendSelectedModelId(intersects, sign){
    	let arr = []
    	// 绘制矩形并把它的世界坐标保存进scene
    	if (sign) {
    		// 给自己绘制的矩形添加特殊标识
    		let userData = {
    			drawRectScreenCoord: JSON.parse(JSON.stringify(drawRectScreenCoord)),
    			drawRectWorldCoord: JSON.parse(JSON.stringify(drawRectWorldCoord)),
    			type: sign
    		}
            // 不在这添加，每次绘制会重新请求批注列表，把之前自己绘制的先全部删除，再重新绘制，为了给每个对象添加唯一标识---item.annotationId
			dxfCallback({
	    		type: 'selectedComponentDxf',
	    		data: JSON.parse(JSON.stringify(userData))
	    	})
    	} else if (intersects[0] && intersects[0].object && intersects[0].object.object && intersects[0].object.object.userData && intersects[0].object.object.userData.type) {
    		// 点击的是之前绘制的矩形框
    		let rectData = intersects[0].object.object
    		// 将自己添加的矩形框的世界坐标转换为当前所对应的屏幕坐标
			let start = {
				x: rectData.userData.drawRectWorldCoord.startX,
				y: rectData.userData.drawRectWorldCoord.startY,
				z: 0
			}
			let end = {
				x: rectData.userData.drawRectWorldCoord.endX,
				y: rectData.userData.drawRectWorldCoord.endY,
				z: 0
			}
    		rectData.userData.drawRectScreenCoord.startX = controls.pointToScreenPosition(start, screenValue).x
			rectData.userData.drawRectScreenCoord.startY = controls.pointToScreenPosition(start, screenValue).y
			rectData.userData.drawRectScreenCoord.endX = controls.pointToScreenPosition(end, screenValue).x
			rectData.userData.drawRectScreenCoord.endY = controls.pointToScreenPosition(end, screenValue).y
			dxfCallback({
	    		type: 'selectedComponentDxf',
	    		data: JSON.parse(JSON.stringify(rectData))
	    	})
    	} else {
    		arr = arr.concat(filterModelIdByIntersects(intersects))
    		// 去重
			arr = Array.from(new Set(arr))
    		// 点击dxf自有的构件
    		let i = {
    			type: 'OwnComponent',
    			drawRectBoxModelId: arr
    		}
			dxfCallback({
	    		type: 'selectedComponentDxf',
	    		data: JSON.parse(JSON.stringify(i))
	    	})
    	}
    }
	// 修改
	this.changeLineControls = function (dims, changeWidth, changeHeight, changeCamera, changeParent, changeScene){
		if (changeCamera) {
			camera = null
			camera = changeCamera
		}
		if (changeParent) {
			parent = null
			parent = changeParent
		}
		if (changeScene) {
			scene = null
			scene = changeScene
		}
		width = changeWidth
		height = changeHeight
		screenValue.minCoordinate = dims.min
		screenValue.maxCoordinate = dims.max
		screenValue.canvasWidth = changeWidth
		screenValue.canvasHeight = changeHeight
		INTERSECTED = null
		INTERSECTEDFIRST = null
		/**
		 * 根据包围盒画出来最大点与最小点
		let rectShape = new THREE.Shape();
        rectShape.moveTo(dims.min.x,dims.min.y);
        rectShape.lineTo(dims.max.x,dims.max.y);
        let points = rectShape.getPoints();
        let geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
        
        // 这两行是绘制的虚线
        let line = new THREE.Line(geometryPoints, new THREE.LineDashedMaterial({ color: roleColorData[0], dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
        line.computeLineDistances()
        
    	line.name = 'drawRectCallback'
    	scene.add(line)
    	renderer.render(scene,camera)
    	*/
	}
	// 重新绘制矩形框
	this.drawRectInitData = function (el){
		let data = el.coordinate.drawRectWorldCoord
		switch (el.coordinate.type){
			case 'drawRectType':
				// 绘制矩形框
				drawRectBox(data, el)
				break;
			case 'drawCloudType':
				// 绘制云线
				drawCloudBox(data, el)
				break;
			case 'drawPlaneType':
				// 绘制平面
				drawPlaneBox(data, el)
				break;
			case 'drawArrowType':
				// 绘制箭头
				drawArrowBox(data, el)
				break;
			default:
				// 绘制平面
				drawRectBox(data, el)
				break;
		}
		renderer.render(scene,camera)
	}
	
	// 绘制矩形框
	function drawRectBox(data, el){
		// 给定两个对角点的坐标绘制虚线矩形框
		let rectShape = new THREE.Shape();
        rectShape.moveTo(data.startX,data.startY);
        rectShape.lineTo(data.startX,data.endY);
        rectShape.lineTo(data.endX,data.endY);
        rectShape.lineTo(data.endX,data.startY);
        rectShape.lineTo(data.startX,data.startY);
        let points = rectShape.getPoints();
        let geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
        let line = new THREE.Line( geometryPoints, new THREE.LineBasicMaterial({ color: (el && el.toRole) ? roleColorData[el.toRole] : roleColorData[0], linewidth: 1}));
        // 矩形虚线框
        // let line = new THREE.Line( geometryPoints, new THREE.LineDashedMaterial({ color: (el && el.toRole) ? roleColorData[el.toRole] : roleColorData[0], dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
        // line.computeLineDistances()
        
        if (el && el.annotationId) {
    		// 给自己绘制的矩形添加特殊标识
            line.name = el.annotationId
            line.userData = el.coordinate
    	} else {
    		line.name = 'rect_move'
    	}
		scene.add( line );
	}
	
	// 绘制平面
	function drawPlaneBox(data, el){
		// 给定两个对角点的坐标绘制平面
		let geometry = new THREE.PlaneBufferGeometry( Math.abs(data.endX - data.startX), Math.abs(data.endY - data.startY), 1, 1 );
		//类型数组创建顶点位置position数据
		let vertices = new Float32Array([
		  data.startX,data.startY, 0, //顶点1坐标
		  data.endX,data.startY, 0, //顶点2坐标
		  data.endX,data.endY, 0, //顶点3坐标
		  data.startX,data.endY, 0, //顶点6坐标
		]);
		// 创建属性缓冲区对象
		let attribue = new THREE.BufferAttribute(vertices, 3); //3个为一组
		// 设置几何体attributes属性的位置position属性
		geometry.attributes.position = attribue
		let normals = new Float32Array([
		  0, 0, 1, //顶点1法向量
		  0, 0, 1, //顶点2法向量
		  0, 0, 1, //顶点3法向量
		  0, 0, 1, //顶点6法向量
		]);
		// 设置几何体attributes属性的位置normal属性
		geometry.attributes.normal = new THREE.BufferAttribute(normals, 3); //3个为一组,表示一个顶点的xyz坐标
		// Uint16Array类型数组创建顶点索引数据
		let indexes = new Uint16Array([
		  // 0对应第1个顶点位置数据、第1个顶点法向量数据
		  // 1对应第2个顶点位置数据、第2个顶点法向量数据
		  // 索引值3个为一组，表示一个三角形的3个顶点
		  0, 1, 2,
		  0, 2, 3,
		])
		// 索引数据赋值给几何体的index属性
		geometry.index = new THREE.BufferAttribute(indexes, 1); //1个为一组
		
		let material = new THREE.MeshBasicMaterial( {color: (el && el.toRole) ? roleColorData[el.toRole] : roleColorData[0], transparent: true, opacity: 0.5, side: THREE.DoubleSide} );
		let plane = new THREE.Mesh( geometry, material );
		if (el && el.annotationId) {
    		// 给自己绘制的矩形添加特殊标识
            plane.name = el.annotationId
            plane.userData = el.coordinate
    	} else {
    		plane.name = 'plane_move'
    	}
		scene.add( plane );
	}
	
	//获得鼠标位置与X轴正方向之间的夹角,前提是以(mx, my)为原点,下面的mx, my代表的就是原点坐标
	function computeAngle(px, py, mx, my) {
        var x = Math.abs(px - mx)
        var y = Math.abs(py - my)
        var z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
        var sin = y / z
        //用反三角函数求弧度
        var radina = Math.asin(sin)
        //将弧度转换成角度
        var angle = Math.floor(180 / (Math.PI / radina))
        //鼠标在x轴正方向上
        if(mx > px && my == py) {
            angle = 0
        }
        //鼠标在x轴负方向
        if(mx < px && my == py) {
            angle = 180
        }
        //鼠标在y轴正方向上
        if(mx == px && my < py) {
            angle = 270
        }
        //鼠标在y轴负方向上
        if(mx == px && my > py) {
            angle = 90
        }
        //鼠标在第一象限
        if(mx > px && my < py) {
            angle = 180 - angle
        }
        //鼠标在第二象限
        if(mx < px && my < py) {
            angle = angle
        }
        //鼠标在第三象限
        if(mx < px && my > py) {
            angle = 360 - angle
        }
        //鼠标在第四象限
        if(mx > px && my > py) {
            angle = 180 + angle
        }
        return angle
    }
	
	// 绘制箭头
	function drawArrowBox(data, el){
		
		let angle = computeAngle(data.endX, data.endY, data.startX, data.startY)
		let angleValue = 1
		if (angle > 90 && angle < 270) {
			angleValue = -1
		} else {
			angleValue = 1
		}
		
		let nearDistance = 1
		let farDistance = 2
		let nearDiff = 0.5
		let farDiff = 2
		
		// 第一象限
		let x1 = data.startX
		let y1 = data.startY
		let x2 = data.endX
		let y2 = data.endY
		let k = (y1 - y2) / (x1 - x2)
		let b = ((x1 * y2) - (x2 * y1)) / (x1 - x2)
		let A = y2 - y1
		let B = x1 - x2
		let C = x2 * y1 - x1 * y2
		
		let sinA = (x2 - x1) !== 0 ? Math.abs((y2 - y1) / (x2 - x1)) : 0
		let cosA = (y2 - y1) !== 0 ? Math.abs((x2 - x1) / (y2 - y1)) : 0
		
		if (sinA <= 1) {
			nearDistance = nearDistance * (1 + Math.pow(sinA, sinA))
			farDistance = farDistance * (1 + Math.pow(sinA, sinA))
			nearDiff = nearDiff * sinA
			farDiff = farDiff * sinA
		} else{
			nearDistance = nearDistance * (Math.pow((1 + cosA), cosA) - (1 - cosA)) * (2 - cosA)
			farDistance = farDistance * (Math.pow((1 + cosA), cosA) - (1 - cosA)) * (2 - cosA)
			nearDiff = nearDiff * (2 - cosA)
			farDiff = farDiff * (2 - cosA)
		}
		
		let dx = x2 - nearDistance * angleValue
		let dy = (-C - A * dx) / B	// 已知dx求dy的值
		let fx = dx - nearDiff
		// 已知直线率为k,其垂线过点(dx,dy)  垂线公式为y=-(1/k)(x-dx)+dy
		let fy = (-1 / k) * (fx - dx) + dy
		let bx = dx + nearDiff
		let by = (-1 / k) * (bx - dx) + dy
		// 之后再把垂线向下平移一点
		let ex = x2 - farDistance * angleValue
		let ey = (-C - A * ex) / B
		let mx = ex - farDiff
		let my = (-1 / k) * (mx - ex) + ey
		let nx = ex + farDiff
		let ny = (-1 / k) * (nx - ex) + ey
		
		if ((x2 - x1) === 0 || (y2 - y1) === 0) {
			return false;
		}
		// 给定两个对角点的坐标绘制平面
		let geometry = new THREE.PlaneBufferGeometry( Math.abs(x2 - x1), Math.abs(y2 - y1), 1, 1 );
		//类型数组创建顶点位置position数据
		let vertices = new Float32Array([
		  x1, y1, 0,
		  x2, y2, 0,
		  fx, fy, 0,
		  mx, my, 0,
		  bx, by, 0,
		  nx, ny, 0,
		]);
		// 创建属性缓冲区对象
		let attribue = new THREE.BufferAttribute(vertices, 3); //3个为一组
		// 设置几何体attributes属性的位置position属性
		geometry.attributes.position = attribue
		let normals = new Float32Array([
		  0, 0, 1,
		  0, 0, 1,
		  0, 0, 1,
		  0, 0, 1,
		  0, 0, 1,
		  0, 0, 1,
		]);
		// 设置几何体attributes属性的位置normal属性
		geometry.attributes.normal = new THREE.BufferAttribute(normals, 3); //3个为一组,表示一个顶点的xyz坐标
		// Uint16Array类型数组创建顶点索引数据
		let indexes = new Uint16Array([
			0, 1, 2,
			1, 2, 3,
			0, 1, 4,
			1, 4, 5,
		])
		// 索引数据赋值给几何体的index属性
		geometry.index = new THREE.BufferAttribute(indexes, 1); //3个为一组
		
		let material = new THREE.MeshBasicMaterial( {color: (el && el.toRole) ? roleColorData[el.toRole] : roleColorData[0], transparent: true, opacity: 0.5, side: THREE.DoubleSide} );
		let plane = new THREE.Mesh( geometry, material );
		if (el && el.annotationId) {
    		// 给自己绘制的矩形添加特殊标识
            plane.name = el.annotationId
            plane.userData = el.coordinate
    	} else {
    		plane.name = 'arrow_move'
    	}
		scene.add( plane );
	}
	
	// 绘制云线
	function drawCloudBox(data, el){
		// 重置所有顶点的数据
		let pointData = []
		// 清空之前的所有顶点
        bezierCurveArr = []
		// start代表的是左上角，end代表的是右下角
		let startX, startY, endX, endY
        if (data.startX < data.endX) {
        	startX = data.startX
        	endX = data.endX
        } else{
        	startX = data.endX
        	endX = data.startX
        }
        if (data.startY > data.endY) {
        	startY = data.startY
        	endY = data.endY
        } else{
        	startY = data.endY
        	endY = data.startY
        }
		upLine(startX, startY, endX, endY)
        rightLine(startX, startY, endX, endY)
        downLine(startX, startY, endX, endY)
        leftLine(startX, startY, endX, endY)
        // 遍历绘制云线
        bezierCurveArr.forEach((item,index) => {
        	pointData = pointData.concat(getBezierCurvePoint(item))
        })
        drawBezierCurve(pointData, el)
	}
	
	function upLine(px, py, mx, my){
		let one = Math.abs((mx - px) / bezierCurveLength)
		for (let i = 0; i < one; i++) {
			let obj = {}
			if (mx - (px + bezierCurveLength * i) < bezierCurveLength) {
				// 最后一点
				obj.startPoint = {
					x: px + bezierCurveLength * i,
					y: py,
					z: 0
				}
				obj.endPoint = {
					x: mx,
					y: py,
					z: 0
				}
				obj.middlePoint = {
					x: (px + bezierCurveLength * i) + ((mx - (px + bezierCurveLength * i)) / 2),
					y: py + bezierCurveHeight,
					z: 0
				}
			} else {
				obj.startPoint = {
					x: px + bezierCurveLength * i,
					y: py,
					z: 0
				}
				obj.endPoint = {
					x: px + bezierCurveLength * (i + 1),
					y: py,
					z: 0
				}
				obj.middlePoint = {
					x: px + bezierCurveLength * (i + 0.5),
					y: py + bezierCurveHeight,
					z: 0
				}
			}
			bezierCurveArr.push(obj)
		}
	}
	
	function rightLine(px, py, mx, my){
		let one = Math.abs((my - py) / bezierCurveLength)
		for (let i = 0; i < one; i++) {
			let obj = {}
			if (py - (my + bezierCurveLength * i) < bezierCurveLength) {
				// 最后一点
				obj.startPoint = {
					x: mx,
					y: py - bezierCurveLength * i,
					z: 0
				}
				obj.endPoint = {
					x: mx,
					y: my,
					z: 0
				}
				obj.middlePoint = {
					x: mx + bezierCurveHeight,
					y: my + (((py - bezierCurveLength * i) - my) / 2),
					z: 0
				}
			} else {
				obj.startPoint = {
					x: mx,
					y: py - bezierCurveLength * i,
					z: 0
				}
				obj.endPoint = {
					x: mx,
					y: py - bezierCurveLength * (i + 1),
					z: 0
				}
				obj.middlePoint = {
					x: mx + bezierCurveHeight,
					y: py - bezierCurveLength * (i + 0.5),
					z: 0
				}
			}
			bezierCurveArr.push(obj)
		}
	}
	
	function downLine(px, py, mx, my){
		let one = Math.abs((mx - px) / bezierCurveLength)
		for (let i = 0; i < one; i++) {
			let obj = {}
			if (mx - (px + bezierCurveLength * i) < bezierCurveLength) {
				// 最后一点
				obj.startPoint = {
					x: mx - bezierCurveLength * i,
					y: my,
					z: 0
				}
				obj.endPoint = {
					x: px,
					y: my,
					z: 0
				}
				obj.middlePoint = {
					x: px + (((mx - bezierCurveLength * i) - px) / 2),
					y: my - bezierCurveHeight,
					z: 0
				}
			} else {
				obj.startPoint = {
					x: mx - bezierCurveLength * i,
					y: my,
					z: 0
				}
				obj.endPoint = {
					x: mx - bezierCurveLength * (i + 1),
					y: my,
					z: 0
				}
				obj.middlePoint = {
					x: mx - bezierCurveLength * (i + 0.5),
					y: my - bezierCurveHeight,
					z: 0
				}
			}
			bezierCurveArr.push(obj)
		}
	}
	
	function leftLine(px, py, mx, my){
		let one = Math.abs((my - py) / bezierCurveLength)
		for (let i = 0; i < one; i++) {
			let obj = {}
			if (py - (my + bezierCurveLength * i) < bezierCurveLength) {
				// 最后一点
				obj.startPoint = {
					x: px,
					y: my + bezierCurveLength * i,
					z: 0
				}
				obj.endPoint = {
					x: px,
					y: py,
					z: 0
				}
				obj.middlePoint = {
					x: px - bezierCurveHeight,
					y: py - ((py - (my + bezierCurveLength * i)) / 2),
					z: 0
				}
			} else {
				obj.startPoint = {
					x: px,
					y: my + bezierCurveLength * i,
					z: 0
				}
				obj.endPoint = {
					x: px,
					y: my + bezierCurveLength * (i + 1),
					z: 0
				}
				obj.middlePoint = {
					x: px - bezierCurveHeight,
					y: my + bezierCurveLength * (i + 0.5),
					z: 0
				}
			}
			bezierCurveArr.push(obj)
		}
	}
	
	function getBezierCurvePoint(data){
		let curve = new THREE.QuadraticBezierCurve3(
			new THREE.Vector3( data.startPoint.x, data.startPoint.y, data.startPoint.z ),
			new THREE.Vector3( data.middlePoint.x, data.middlePoint.y, data.middlePoint.z ),
			new THREE.Vector3( data.endPoint.x, data.endPoint.y, data.endPoint.z )
		);
		let points = curve.getPoints( 50 )
		return points
	}
	
	function drawBezierCurve(pointData, el){
		let geometry = new THREE.BufferGeometry().setFromPoints(pointData)
		let material = new THREE.LineBasicMaterial({ color: (el && el.toRole) ? roleColorData[el.toRole] : roleColorData[0], linewidth: 1 })
		// Create the final object to add to the scene
		let curveObject = new THREE.Line(geometry, material)
		if (el && el.annotationId) {
			// 之前的云线框
			curveObject.name = el.annotationId
            curveObject.userData = el.coordinate
		} else {
    		curveObject.name = 'cloud_move'
    	}
		scene.add(curveObject)
	}
	
	// 外部调用绘制面积，距离，角度，周长
	this.commonDxfDrawEvent = function (type, callback) {
		pointsArrayStr = []
		commonDxfDrawEventType = type
		if (type === 'drawRectCallback') {
			LineControlsCallback = callback
			fsm.drawRect()
		}
		if (type === 'drawLineCallback') {
			LineControlsCallback = callback
			fsm.drawLine()
		}
		if (type === 'drawAngleCallback') {
			LineControlsCallback = callback
			fsm.drawLine()
		}
	}
    
    
    
    //鼠标右键点击事件
    parent.oncontextmenu = function(ev){
        switch (fsm.state) {
            case 'highlight': //高亮状态
            
            	// 暂时关闭右键操作列表
            	listBox.style.display = 'none';
            	
                //兼容性写法示例：
                var ev = ev || event;//或（||）书写顺序有讲究，不能随意换
                //阻止默认行为
                ev.preventDefault();

                //记录当前的坐标(x轴和y轴)
                var x = ev.clientX;
                var y = ev.clientY;
                if (INTERSECTEDFIRST){

                    if (INTERSECTEDFIRST != INTERSECTED){
                        if (INTERSECTED){
                            INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                            INTERSECTEDFIRST = INTERSECTED;
                            INTERSECTED = null;
                            //改变物体的颜色(红色)
                            INTERSECTEDFIRST.material.color.set( roleColorData[0] );
                            renderer.render(scene,camera);
                        }
                    }
                    
                    // 判断当选中了自己绘制的矩形的时候右键弹出删除按钮
                    if (INTERSECTEDFIRST && INTERSECTEDFIRST.userData && INTERSECTEDFIRST.userData.type) {
                    	listBox.style.display = 'block';//右键点击时显示菜单框
                    	listBox.style.left = x + 'px';
                    	listBox.style.top = y + 'px';
                    }
                    // 判断是自己绘制的线
                    if (INTERSECTEDFIRST && INTERSECTEDFIRST.name === 'line_move') {
                    	listBox.style.display = 'block';//右键点击时显示菜单框
                    	listBox.style.left = x + 'px';
                    	listBox.style.top = y + 'px';
                    }
                    // 判断是外部调用绘制面积，距离，角度，周长
                    if (INTERSECTEDFIRST && INTERSECTEDFIRST.name === 'drawRectCallback') {
                    	listBox.style.display = 'block';//右键点击时显示菜单框
                    	listBox.style.left = x + 'px';
                    	listBox.style.top = y + 'px';
                    }
                    
                }else {
                    if (INTERSECTED){
                        INTERSECTEDFIRST = INTERSECTED;
                        INTERSECTED = null;
                        //改变物体的颜色(红色)
                        INTERSECTEDFIRST.material.color.set( roleColorData[0] );
                        renderer.render(scene,camera);
                        
                        // 判断当选中了自己绘制的矩形的时候右键弹出删除按钮
                        if (INTERSECTEDFIRST && INTERSECTEDFIRST.userData && INTERSECTEDFIRST.userData.type) {
                        	listBox.style.display = 'block';//右键点击时显示菜单框
                        	listBox.style.left = x + 'px';
                        	listBox.style.top = y + 'px';
                        }
                        // 判断是自己绘制的线
                        if (INTERSECTEDFIRST && INTERSECTEDFIRST.name === 'line_move') {
                        	listBox.style.display = 'block';//右键点击时显示菜单框
                        	listBox.style.left = x + 'px';
                        	listBox.style.top = y + 'px';
                        }
                        // 判断是外部调用绘制面积，距离，角度，周长
                        if (INTERSECTEDFIRST && INTERSECTEDFIRST.name === 'drawRectCallback') {
                        	listBox.style.display = 'block';//右键点击时显示菜单框
                        	listBox.style.left = x + 'px';
                        	listBox.style.top = y + 'px';
                        }
                        
                    }
                }
                //关闭右键
                parent.onclick = function(){
                    listBox.style.display = 'none';//再次点击时隐藏菜单框
                }
                break;
            case 'selected':
                break;
            case 'drawingLine':
                break;
        }
    };
    this.LineRender = function(render) { renderer = render };

    //右键删除线条
    function deleteOneLine(e){
        if (INTERSECTEDFIRST){
        	
        	dxfCallback({
	    		type: 'deleteAnnotationDxf',
	    		data: JSON.parse(JSON.stringify(INTERSECTEDFIRST.name))
	    	})
        	
        	/*
        	// 同时删除和批注一块的批注问题类型与批注内容详情
        	if (scene.getObjectByName('type' + INTERSECTEDFIRST.name)) {
                scene.remove(scene.getObjectByName('type' + INTERSECTEDFIRST.name));
            }
        	if (scene.getObjectByName('content' + INTERSECTEDFIRST.name)) {
                scene.remove(scene.getObjectByName('content' + INTERSECTEDFIRST.name));
            }
            scene.remove(INTERSECTEDFIRST);
            renderer.render(scene, camera);
            */
            INTERSECTEDFIRST = null;
        }
        listBox.style.display = 'none';
    }

    /* 获取鼠标点击的位置 */
    function getIntersects(event) {
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left; //x position within the element.
        var y = event.clientY - rect.top;  //y position within the element.
        if (event.type.indexOf('touch') != -1) {
        	x = event.changedTouches[0].clientX - rect.left;
        	y = event.changedTouches[0].clientY - rect.top;
        }
        mouse.x = (x / width) * 2 - 1;
        mouse.y = -(y / height) * 2 + 1;
        var vector = new THREE.Vector3(mouse.x, mouse.y, -1);
        vector.unproject(camera);
        /* 返回向量 */
        return vector;
    }

    activate();
}