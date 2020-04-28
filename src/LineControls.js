

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

let LineControlsCallback = '';	// 绘制面积，距离，角度，周长的回调
let pointsArrayStr = [];		// 记录当前点击的点的集合
let commonDxfDrawEventType = '';// 记录外部操作的type

export default function LineControls(camera,parent,scene,width,height,controls,dxfCallback) {
    var deleteLine = document.getElementById("delete");
    var listBox = document.getElementById('dxfOperateList');//获取自定义右键菜单
    var drawLineBtn = document.getElementById("drawLine");
    var drawRectBtn = document.getElementById("drawRect");
    var isDrawing = false;
    
    let drawRectScreenCoord = {startX: 0, startY: 0, endX: 0, endY: 0};	// 记录当前绘制的矩形的屏幕坐标
    let drawRectWorldCoord = {startX: 0, startY: 0, endX: 0, endY: 0};	// 记录当前绘制的矩形的世界坐标
    let boundingClientRect = {left: 0, top: 0};	// 记录绘制矩形时的值event.target.getBoundingClientRect()
    let screenData = {};
    let scope = this;

    function activate() {
        deleteLine.addEventListener("click",deleteOneLine,false);
        parent.addEventListener( 'mousemove', onDocumentMouseMove, false );
        parent.addEventListener( 'mousedown', onDocumentMouseDown, false );
        parent.addEventListener( 'mouseup', onDocumentMouseUp, false );
    }

    /**
     * highlight :默认状态
     * selected ：选中对象状态
     * drawingLine ：绘制直线状态
     */
    var fsm = new StateMachine({
        init: 'highlight',
        transitions: [
            { name: 'highlight',   from: '*', to: 'highlight'  },
            { name: 'select',     from: '*',  to: 'selected' },
            { name: 'drawLine', from: '*', to: 'drawingLine'    },
            { name: 'drawRect', from: '*', to: 'drawingRect'    }
        ],
        methods: {
            onEnterHighlight:function(){
                if (INTERSECTEDFIRST) {
                    INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                    INTERSECTEDFIRST = null;
                    renderer.render(scene,camera);
                }
            },
        }
    });


    function onDocumentMouseDown(e) {
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
                var btnNum = e.button;
                if (btnNum == 0){
                	
                	// 省的点击取消的时候再删除之前没有保存的批注框了
            		renderer.render(scene,camera);
                	
                	// 记录绘制矩形的开始点屏幕坐标
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
                		INTERSECTEDLIST[index].object.material.color.set( 0x00ff00 );
                	})
                }
                INTERSECTEDLIST = intersects
                INTERSECTEDLIST.forEach((item,index) => {
                	INTERSECTEDLIST[index].object.material.color.set( 0xFF3030 );
                })
                */
                
                intersects[0].object.material.color.set( 0x00ff00 );
                
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
                	INTERSECTEDLIST[index].object.material.color.set( 0x00ff00 );
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
            if (intersects.length > 0) {
            	
            	sendSelectedModelId(JSON.parse(JSON.stringify(intersects)))
            	
                if (INTERSECTEDFIRST != intersects[0].object){
                    if (INTERSECTEDFIRST){
                        INTERSECTEDFIRST.material.color.set(INTERSECTEDFIRST.currentHex);//恢复选择前的默认颜色
                        // INTERSECTEDFIRST.material.opacity = 1.0;
                    }
                    INTERSECTEDFIRST = INTERSECTED;
                    INTERSECTED = null;
                    //改变物体的颜色
                    intersects[0].object.material.color.set( 0x00ff00 );
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
            var pointsMaterial = new THREE.PointsMaterial({color:0xff0000, size: 3});
            var points = new THREE.Points(pointsGeometry, pointsMaterial);
            pointsArray.push(points);
            
            

            /* 创建线段 */
            var lineGeometry = new THREE.Geometry();
            var lineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
			
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
                scene.remove(scene.getObjectByName('line_move'));
                /* 删除数组中的元素，否则的话再次重绘会链接之前的点接着重绘 */
                pointsArray.shift();
            }
            renderer.render(scene,camera);
        }else {
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
        var lineMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});
        if (pointsArray.length > 0){
            lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0]);
            var pointsGeometry = new THREE.Geometry();
            pointsGeometry.vertices.push(intersects);
            var pointsMaterial = new THREE.PointsMaterial({color:0x00ff00, size: 3});
            var points = new THREE.Points(pointsGeometry, pointsMaterial);
            lineGeometry.vertices.push(points.geometry.vertices[0]);
            var line = new THREE.Line(lineGeometry, lineMaterial);
            line.name = 'line_move';
            scene.add(line);
            renderer.render(scene,camera);
        }
    }

    function drawRectangleOnMove(e){
        if (isDrawing){
            if (scene.getObjectByName('rect_move')) {
                scene.remove(scene.getObjectByName('rect_move'));
            }
            var rectShape = new THREE.Shape();
            var vector = getIntersects(e);
            rectShape.moveTo(vectorRect.x,vectorRect.y);
            rectShape.lineTo(vectorRect.x,vector.y);
            rectShape.lineTo(vector.x,vector.y);
            rectShape.lineTo(vector.x,vectorRect.y);
            rectShape.lineTo(vectorRect.x,vectorRect.y);
            var points = rectShape.getPoints();
            var geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
            // var line = new THREE.Line( geometryPoints, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
            
            // 这两行是绘制的虚线
            var line = new THREE.Line(geometryPoints, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
            line.computeLineDistances()
            
            line.name = 'rect_move';
            scene.add( line );
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
            var rectShape = new THREE.Shape();
            var vector = getIntersects(event);
            rectShape.moveTo(vectorRect.x,vectorRect.y);
            rectShape.lineTo(vectorRect.x,vector.y);
            rectShape.lineTo(vector.x,vector.y);
            rectShape.lineTo(vector.x,vectorRect.y);
            rectShape.lineTo(vectorRect.x,vectorRect.y);
            var points = rectShape.getPoints();
            var geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
            // var line = new THREE.Line( geometryPoints, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
            
            // 这两行是绘制的虚线
            var line = new THREE.Line(geometryPoints, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
            line.computeLineDistances()
            
            // 记录绘制矩形的开始点与结束点的屏幕坐标所对应的世界坐标
            drawRectWorldCoord.startX = vectorRect.x
            drawRectWorldCoord.startY = vectorRect.y
            drawRectWorldCoord.endX = vector.x
            drawRectWorldCoord.endY = vector.y
            
            boundingClientRect = event.target.getBoundingClientRect();
            
            if (LineControlsCallback) {
            	// 外部调用绘制面积，距离，角度，周长
            	LineControlsCallback(drawRectWorldCoord)
            	line.name = 'drawRectCallback'
            	scene.add(line)
            	renderer.render(scene,camera);
            	setTimeout(() => {
            		fsm.highlight();
            		LineControlsCallback = ''
            	}, 100)
            } else {
            	// 批注框选-前端计算
            	// drawRectSelected(line)
            	// 批注框选-传入屏幕坐标，后端计算
            	sendSelectedModelId([], line)
            }
            
        }
    }
    
    // 判断当前选中的所有屏幕坐标对应的物体
    function drawRectSelected(line){
    	let arr = []
    	let minx = drawRectScreenCoord.startX < drawRectScreenCoord.endX ? drawRectScreenCoord.startX : drawRectScreenCoord.endX
    	let miny = drawRectScreenCoord.startY < drawRectScreenCoord.endY ? drawRectScreenCoord.startY : drawRectScreenCoord.endY
    	let maxx = drawRectScreenCoord.startX < drawRectScreenCoord.endX ? drawRectScreenCoord.endX : drawRectScreenCoord.startX
    	let maxy = drawRectScreenCoord.startY < drawRectScreenCoord.endY ? drawRectScreenCoord.endY : drawRectScreenCoord.startY
    	
    	// 为了加快查找进度，根据选择范围动态更改选点间距
    	let differenceX = Math.ceil((maxx - minx) / 20)
    	let differenceY = Math.ceil((maxy - miny) / 20)
    	
    	for (let i = minx; i <= maxx; i = i + differenceX) {
    		for (let j = miny; j <= maxy; j = j + differenceY) {
    			let obj = {
    				x: i,
    				y: j
    			}
    			arr.push(obj)
    		}
    	}
    	
    	let selectArr = []
    	arr.forEach((item,index) => {
    		selectArr = selectArr.concat(selectedUuidByScreenCoord(item))
    	})
    	sendSelectedModelId(selectArr, line)
    }
    // 根据屏幕坐标计算当前选择的构件列表
    function selectedUuidByScreenCoord(data){
    	let obj = {}
        var x = data.x - boundingClientRect.left;
        var y = data.y - boundingClientRect.top;
        obj.x = (x / width) * 2 - 1;
        obj.y = -(y / height) * 2 + 1;
        var ray = new THREE.Raycaster();
        ray.setFromCamera( obj, camera );
        var intersects = ray.intersectObjects(scene.children, true);
        let arr = JSON.parse(JSON.stringify(intersects))
        return arr
    }
    // 根据世界坐标计算当前选择的构件
    function selectedUuidByWorldCoord(data){
        var ray = new THREE.Raycaster();
        ray.setFromCamera( data, camera );
        var intersects = ray.intersectObjects(scene.children, true);
        let arr = JSON.parse(JSON.stringify(intersects))
        return arr
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
    function sendSelectedModelId(intersects, line){
    	let arr = []
    	
    	
    	/*
    	// 添加所点击的dxf自有的构件
    	arr = arr.concat(filterModelIdByIntersects(intersects))
		intersects.forEach((item,index) => {
			if (item.object && item.object.object && item.object.object.userData && item.object.object.userData.type === 'drawRect') {
				// 点击的自己画的框
				if (item.object.object.userData.drawRectBoxModelId && item.object.object.userData.drawRectBoxModelId.length > 0) {
					arr = arr.concat(item.object.object.userData.drawRectBoxModelId)
				}
			}
			
			
			if (item.object && item.object.object && item.object.object.userData && item.object.object.userData.type === 'drawRect' && item.object.object.userData.drawRectWorldCoord) {
				// 将自己添加的矩形框的世界坐标转换为当前所对应的屏幕坐标
				let start = {
					x: item.object.object.userData.drawRectWorldCoord.startX,
					y: item.object.object.userData.drawRectWorldCoord.startY,
					z: 0
				}
				let end = {
					x: item.object.object.userData.drawRectWorldCoord.endX,
					y: item.object.object.userData.drawRectWorldCoord.endY,
					z: 0
				}
				item.object.object.userData.drawRectScreenCoord.startX = scope.pointToScreenPosition(start).x
				item.object.object.userData.drawRectScreenCoord.startY = scope.pointToScreenPosition(start).y
				item.object.object.userData.drawRectScreenCoord.endX = scope.pointToScreenPosition(end).x
				item.object.object.userData.drawRectScreenCoord.endY = scope.pointToScreenPosition(end).y
				arr = arr.concat(filterModelIdByIntersects(updateRectSelected(item.object.object.userData.drawRectScreenCoord)))
			}
		})
		// 去重
		arr = Array.from(new Set(arr))
    	*/
    	
    	
    	// 绘制矩形并把它的世界坐标保存进scene
    	if (line) {
    		// 给自己绘制的矩形添加特殊标识
            line.userData.drawRectScreenCoord = JSON.parse(JSON.stringify(drawRectScreenCoord))
            line.userData.drawRectBoxModelId = JSON.parse(JSON.stringify(arr))
            line.userData.drawRectWorldCoord = JSON.parse(JSON.stringify(drawRectWorldCoord))
            line.userData.type = 'drawRect'
            // 不在这添加，每次绘制会重新请求批注列表，把之前自己绘制的先全部删除，再重新绘制，为了给每个对象添加唯一标识---item.dxfAnnotationId
			dxfCallback({
	    		type: 'selectedComponentDxf',
	    		data: JSON.parse(JSON.stringify(line.userData))
	    	})
    	} else if (intersects[0] && intersects[0].object && intersects[0].object.object && intersects[0].object.object.userData && intersects[0].object.object.userData.type === 'drawRect') {
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
    		rectData.userData.drawRectScreenCoord.startX = scope.pointToScreenPosition(start).x
			rectData.userData.drawRectScreenCoord.startY = scope.pointToScreenPosition(start).y
			rectData.userData.drawRectScreenCoord.endX = scope.pointToScreenPosition(end).x
			rectData.userData.drawRectScreenCoord.endY = scope.pointToScreenPosition(end).y
    		
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
    // 三维坐标转屏幕坐标
	this.pointToScreenPosition = function (coord) {
		var v4 = new THREE.Vector4()
	    v4.x = coord.x
	    v4.y = coord.y
	    v4.z = 0
	    v4.w = 1
	    v4.applyMatrix4(camera.matrixWorldInverse) //逆矩阵
	    v4.applyMatrix4(camera.projectionMatrix) //投影矩阵
	    v4.x = v4.x / v4.w
	    v4.y = v4.y / v4.w
	    v4.z = v4.z / v4.w
	    v4.x = v4.x * 0.5 + 0.5
	    v4.y = v4.y * 0.5 + 0.5
	    v4.z = v4.z * 0.5 + 0.5
	    v4.x = v4.x * screenData.canvasWidth
//	    v4.x = v4.x * 1920
	    v4.y = (1 - v4.y) * screenData.canvasHeight
//	    v4.y = (1 - v4.y) * 1080
	    return v4
	}
    // 计算所选中的自己添加的矩形框里面的所有构件
    function updateRectSelected(data){
    	let arr = []
    	let minx = data.startX < data.endX ? data.startX : data.endX
    	let miny = data.startY < data.endY ? data.startY : data.endY
    	let maxx = data.startX < data.endX ? data.endX : data.startX
    	let maxy = data.startY < data.endY ? data.endY : data.startY
    	// 为了加快查找进度，根据选择范围动态更改选点间距
    	let differenceX = Math.ceil((maxx - minx) / 20)
    	let differenceY = Math.ceil((maxy - miny) / 20)
    	for (let i = minx; i <= maxx; i = i + differenceX) {
    		for (let j = miny; j <= maxy; j = j + differenceY) {
    			let obj = {
    				x: i,
    				y: j
    			}
    			arr.push(obj)
    		}
    	}
    	
    	let selectArr = []
    	arr.forEach((item,index) => {
    		selectArr = selectArr.concat(selectedUuidByScreenCoord(item))
    	})
    	return selectArr
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
		screenData.minCoordinate = dims.min
		screenData.maxCoordinate = dims.max
		screenData.canvasWidth = changeWidth
		screenData.canvasHeight = changeHeight
		INTERSECTED = null
		INTERSECTEDFIRST = null
		/**
		 * 根据包围盒画出来最大点与最小点
		var rectShape = new THREE.Shape();
        rectShape.moveTo(dims.min.x,dims.min.y);
        rectShape.lineTo(dims.max.x,dims.max.y);
        var points = rectShape.getPoints();
        var geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
        
        // 这两行是绘制的虚线
        var line = new THREE.Line(geometryPoints, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
        line.computeLineDistances()
        
    	line.name = 'drawRectCallback'
    	scene.add(line)
    	renderer.render(scene,camera)
    	*/
	}
	// 重新绘制矩形框
	this.drawRectInitData = function (el){
		let data = el.coordinate.drawRectWorldCoord
		
		var geometry = new THREE.PlaneBufferGeometry( Math.abs(data.endX - data.startX), Math.abs(data.endY - data.startY), 1, 1 );
		//类型数组创建顶点位置position数据
		var vertices = new Float32Array([
		  data.startX,data.startY, 0, //顶点1坐标
		  data.endX,data.startY, 0, //顶点2坐标
		  data.endX,data.endY, 0, //顶点3坐标
		  data.startX,data.endY, 0, //顶点6坐标
		]);
		// 创建属性缓冲区对象
		var attribue = new THREE.BufferAttribute(vertices, 3); //3个为一组
		// 设置几何体attributes属性的位置position属性
		geometry.attributes.position = attribue
		var normals = new Float32Array([
		  0, 0, 1, //顶点1法向量
		  0, 0, 1, //顶点2法向量
		  0, 0, 1, //顶点3法向量
		  0, 0, 1, //顶点6法向量
		]);
		// 设置几何体attributes属性的位置normal属性
		geometry.attributes.normal = new THREE.BufferAttribute(normals, 3); //3个为一组,表示一个顶点的xyz坐标
		// Uint16Array类型数组创建顶点索引数据
		var indexes = new Uint16Array([
		  // 0对应第1个顶点位置数据、第1个顶点法向量数据
		  // 1对应第2个顶点位置数据、第2个顶点法向量数据
		  // 索引值3个为一组，表示一个三角形的3个顶点
		  0, 1, 2,
		  0, 2, 3,
		])
		// 索引数据赋值给几何体的index属性
		geometry.index = new THREE.BufferAttribute(indexes, 1); //1个为一组
		
		var material = new THREE.MeshBasicMaterial( {color: 0x409EFF, transparent: true, opacity: 0.5, side: THREE.DoubleSide} );
		var plane = new THREE.Mesh( geometry, material );
		if (plane) {
    		// 给自己绘制的矩形添加特殊标识
            plane.name = el.dxfAnnotationId
            plane.userData = el.coordinate
            scene.add( plane );
    	}
		
		
		
		/*
		var rectShape = new THREE.Shape();
        rectShape.moveTo(data.startX,data.startY);
        rectShape.lineTo(data.startX,data.endY);
        rectShape.lineTo(data.endX,data.endY);
        rectShape.lineTo(data.endX,data.startY);
        rectShape.lineTo(data.startX,data.startY);
        
//      let linewidth = 0.01
//      rectShape.lineTo(data.startX - linewidth,data.startY - linewidth);
//      rectShape.lineTo(data.startX - linewidth,data.endY - linewidth);
//      rectShape.lineTo(data.endX + linewidth,data.endY - linewidth);
//      rectShape.lineTo(data.endX + linewidth,data.startY + linewidth);
//      rectShape.lineTo(data.startX - linewidth,data.startY + linewidth);
        
        var points = rectShape.getPoints();
        var geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
        var line = new THREE.Line( geometryPoints, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.4, gapSize: 0.6, linewidth: 1, scale: 1, }));
        
        if (line) {
    		// 给自己绘制的矩形添加特殊标识
            line.name = el.dxfAnnotationId
            line.userData = el.coordinate
            line.computeLineDistances()
            scene.add( line );
    	}
    	*/
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
                            INTERSECTEDFIRST.material.color.set( 0x409EFF );
                            renderer.render(scene,camera);
                        }
                    }
                    
                    // 判断当选中了自己绘制的矩形的时候右键弹出删除按钮
                    if (INTERSECTEDFIRST && INTERSECTEDFIRST.userData && INTERSECTEDFIRST.userData.type === 'drawRect') {
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
                        INTERSECTEDFIRST.material.color.set( 0x409EFF );
                        renderer.render(scene,camera);
                        
                        // 判断当选中了自己绘制的矩形的时候右键弹出删除按钮
                        if (INTERSECTEDFIRST && INTERSECTEDFIRST.userData && INTERSECTEDFIRST.userData.type === 'drawRect') {
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
        	// 同时删除和批注一块的批注问题类型与批注内容详情
        	if (scene.getObjectByName('type' + INTERSECTEDFIRST.name)) {
                scene.remove(scene.getObjectByName('type' + INTERSECTEDFIRST.name));
            }
        	if (scene.getObjectByName('content' + INTERSECTEDFIRST.name)) {
                scene.remove(scene.getObjectByName('content' + INTERSECTEDFIRST.name));
            }
            scene.remove(INTERSECTEDFIRST);
            INTERSECTEDFIRST = null;
            renderer.render(scene, camera);
        }
        listBox.style.display = 'none';
    }

    drawLineBtn.onclick = function(){
        if (drawLineBtn.className == "off"){
            drawLineBtn.className = "on";
            drawLineBtn.innerText = "line-on";
            fsm.drawLine();
        }else {
            drawLineBtn.className = "off";
            drawLineBtn.innerText = "line-off";
            if (scene.getObjectByName('line_move')) {
                scene.remove(scene.getObjectByName('line_move'));
                /* 删除数组中的元素，否则的话再次重绘会链接之前的点接着重绘 */
                pointsArray.shift();
            }
            renderer.render(scene,camera);
            fsm.highlight();
        }
    };
    //绘制矩形功能开关
    drawRectBtn.onclick = function(){
        if (drawRectBtn.className.indexOf('off') > -1){
            drawRectBtn.className = "el-button on el-button--default is-plain dxf-el-button";
            drawRectBtn.innerText = "关闭批注";
            fsm.drawRect();
        } else {
            drawRectBtn.className = "el-button off el-button--default is-plain dxf-el-button";
            drawRectBtn.innerText = "开启批注";
            if (scene.getObjectByName('line_move')) {
                scene.remove(scene.getObjectByName('line_move'));
                /* 删除数组中的元素，否则的话再次重绘会链接之前的点接着重绘 */
                pointsArray.shift();
            }
            renderer.render(scene,camera);
            fsm.highlight();
        }
    };

    /* 获取鼠标点击的位置 */
    function getIntersects(event) {
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left; //x position within the element.
        var y = event.clientY - rect.top;  //y position within the element.
        mouse.x = (x / width) * 2 - 1;
        mouse.y = -(y / height) * 2 + 1;
        var vector = new THREE.Vector3(mouse.x, mouse.y, -1);
        vector.unproject(camera);
        /* 返回向量 */
        return vector;
    }

    activate();
}