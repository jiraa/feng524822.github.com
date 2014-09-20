(function(window, undefined) {
    function _ucfirst(str) {
        return  str.charAt(0).toUpperCase() + str.slice(1);
    }

    function _setStyle(elm, name, value) {
        var capName, prefixes, i ,style;

        if (name instanceof Object) {
            for (var prop in name) {
                if (name.hasOwnProperty(prop)) {
                    arguments.callee(elm, prop, name[prop]);
                }
            }
            return elm;
        }

        capName = _ucfirst(name);
        prefixes = [ "Webkit", "O", "Moz", "ms" ];
        i = prefixes.length;
        style = elm.style;

        if (name in style) {
            style[name] = value;
            return elm;
        }

        while(i--) {
            name = prefixes[i] + capName;
            if (name in style) {
                style[name] = value;
                return elm;
            }
        }
    }

    function _addEvent(elm, type, fn, ct, data) {
        if (elm.addEventListener) {
            _addEvent = function(elm, type, fn, ct, data) {
                elm["e" + type + fn] = fn;
                elm[type + fn] = function(evt) {
                    evt.data = data;
                    elm["e" + type + fn].call(ct || window, evt);
                }
                return elm.addEventListener(type, elm[type + fn], false);
            }
        } else {
            _addEvent = function(elm, type, fn, ct, data) {
                elm["e" + type + fn] = fn;
                elm[type + fn] = function() {
                    var evt = window.event;
                    evt.data = data;
                    elm["e" + type + fn].call(ct, evt);
                }
                return elm.attachEvent('on' + type, elm[type + fn]);
            }
        }
        _addEvent.apply(window, arguments);
    }

    function _removeEvent(elm, type, fn) {
        if (elm.removeEventListener) {
            _removeEvent = function(elm, type, fn) {
                return elm.removeEventListener(type, elm[type + fn], false);
            }
        } else {
            _removeEvent = function(elm, type, fn) {
                return elm.detachEvent('on' + type, elm[type + fn]);
            }
        }
        _removeEvent.apply(window, arguments);
    }

    function _setText(elm, text) {
        try {
            elm.innerText = text;
        } catch(e) {
            elm.textContent = text;
        }
    }

    function _getScroll() {
        return {
            left: document.documentElement.scrollLeft || document.body.scrollLeft,
            top: document.documentElement.scrollTop || document.body.scrollTop
        }
    }

    var SUPPORT_TOUCH  = ("ontouchstart" in window) || window.DocumentTouch && document instanceof DocumentTouch;
    function _Drag(elm, callback, context, data) {
        if (arguments.length === 1) {
            _removeEvent(elm, SUPPORT_TOUCH ? 'touchstart' : 'mousedown', _DragEvent);
        }
        _addEvent(elm, SUPPORT_TOUCH ? 'touchstart' : 'mousedown', _DragEvent, null, {
            cb: callback,
            ct: context,
            elm: elm,
            data: data
        });
    }

    function _DragEvent(evt) {
        var data = evt.data,
            scroll = _getScroll();

        data.x = evt.pageX || evt.clientX + scroll.left;
        data.y = evt.pageY || evt.clientY + scroll.top;

        try {
            evt.returnVale = false;
        } catch(e) {
            evt.preventDefault();
        }

        switch(evt.type) {
            case 'touchend':
            case 'mouseup':
                data.type = 'endDrag';
                _removeEvent(document, SUPPORT_TOUCH ? 'touchmove' :'mousemove', _DragEvent);
                _removeEvent(document, SUPPORT_TOUCH ? 'touchend' :'mouseup', _DragEvent);
                data.cb.call(data.ct, data, evt);
                data = evt = null;
            break;
            case 'touchmove':
            case 'mousemove':
                data.type = 'moveDrag';
                data.dx = data.x - data.offsetX;
                data.dy = data.y - data.offsetY;
                data.cb.call(data.ct, data, evt);
            break;
            case 'mousedown':
                data.type = 'startDrag';
                data.offsetX = data.x;
                data.offsetY = data.y;
                data.dx = 0;
                data.dy = 0;
                if (data.cb.call(data.ct, data)) {
                    _addEvent(document, SUPPORT_TOUCH ? 'touchmove' : 'mousemove', _DragEvent, null, data);
                    _addEvent(document, SUPPORT_TOUCH ? 'touchend' : 'mouseup', _DragEvent, null, data);
                }
            break;
        }
    }

    function C2048(container) {
        this.container = container;
        this.areaSize = 100;   // 每个方块的尺寸
        this.padding = 10;     // 方块间距
        this.areas = [];       // 方块区域缓存
        this.doms = {};        // dom缓存
        this.score = 0;        // 分数缓存
        this.init();
    }

    var fn = C2048.prototype;
    fn.init = function() {
        this.buildMatrix();
        this.build();
        this.bindEvent();
        this.start();
    }
    // 重置并重新开始
    fn.reset = function() {
        var doms = this.doms;
        this.unBindEvent();
        doms.main.parentNode.removeChild(doms.main);
        doms.score.parentNode.removeChild(doms.score);
        this.areas = [];
        this.doms = {};
        this.score = 0;
        this.init();
    }
    // 构建矩阵数组
    fn.buildMatrix = function() {
        var num = 4,  // 矩阵尺寸
            count = 0,
            matrix = [];

        for (var i = 0; i < num; i++) {
            var layer = [];
            for (var j = 0; j < num; j++) {
                layer.push(j);
                count++;
            }
            matrix.push(layer);
        }
        this.count = count;
        this.matrix = matrix;
    }
    // 构建界面
    fn.build = function() {
        this.buildMain();
        this.buildScore();
        this.buildControl();
    }
    // 构建游戏主界面
    fn.buildMain = function() {
        var main = document.createElement('div');

        main.style.position = 'relative';
        this.container.appendChild(main);
        this.doms.main = main;

        this.buildAllAreas();
        this.setMainSize();
    }
    // 设置主界面尺寸
    fn.setMainSize = function() {
         _setStyle(this.doms.main, {
            userSelect: 'none',
            width: this.areaSize * 4 + this.padding * 3 + 'px',
            height: this.areaSize * 4 + this.padding * 3 + 'px'
        })
    }
    // 构建所有游戏区块
    fn.buildAllAreas = function() {
        var area,
            i = 0;

        while (i < this.count) {
            area = {
                index: i,
                val: 0,
                elm: null,
                bg: null,
                left: i % 4 * (this.areaSize + this.padding),
                top: Math.floor(i / 4) * (this.areaSize + this.padding)
            };
            this.areas.push(area);
            area.bg = this.buildSquare(i, 1)
            i++;
        }
    }
    // 创建单个区块，isBg为背景区块
    fn.buildSquare = function(i, isBg) {
        var area = this.getArea(i),
            elm = document.createElement('div');

        _setStyle(elm, {
            position: 'absolute',
            width: this.areaSize + 'px',
            height: this.areaSize + 'px',
            lineHeight: this.areaSize + 'px',
            textAlign: 'center',
            borderRadius: '7px',
            left: area.left + 'px',
            top: area.top + 'px',
            zIndex: !isBg + 2,
            backgroundColor: isBg ? '#fff5f5' : '#f57'
        });

        this.doms.main.appendChild(elm);
        return elm;
    }
    // 构建分数界面
    fn.buildScore = function() {
        var score = document.createElement('div');
        _setStyle(score, {
            width: '150px',
            height: '60px',
            lineHeight: '60px',
            fontWeight: 'bold',
            borderRadius: '7px',
            background: '#272727',
            color: '#fff',
            textAlign: 'center',
            fontSize: '24px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: '20px'
        });
        this.doms.score = score;
        this.container.appendChild(score);
    }
    fn.buildControl = function() {
        var doms = this.doms;
        doms.control = document.createElement('div');
        this.container.appendChild(doms.control);
        _setStyle(doms.control, {
            position: 'absolute',
            right: '100px',
            bottom: '100px',
            width: '40px',
            height: '40px'
        });
        var pos = ['top', 'right', 'bottom', 'left'];
        for (var i = 0; i < pos.length; i++) {
            this.buildCtrl(pos[i]);
        }
    }
    fn.buildCtrl = function(pos) {
        var doms = this.doms,
            ctrl = document.createElement('div');
        _setStyle(ctrl, {
            'width': '0',
            'height': '0',
            'position': 'absolute',
            'borderStyle': 'solid',
            'borderColor': 'transparent',
            'borderWidth': '20px'
        });

        var p = {
            'left': 'right',
            'top': 'bottom'
        }
        var another;
        for (var i in p) {
            if (p.hasOwnProperty(i)) {
                if (i == pos) {
                    another = p[i];
                } else if (p[i] == pos) {
                    another = i;
                }
            }
        }
        _setStyle(ctrl, another, '100%');
        _setStyle(ctrl, 'border' + _ucfirst(another) + 'Color', '#333');
        _setStyle(ctrl, 'border' + _ucfirst(another) + 'Width', '40px');
        _setStyle(ctrl, 'border' + _ucfirst(pos) + 'Width', '0');
        doms['ctrl'+pos] = ctrl;
        doms.control.appendChild(ctrl);
        _addEvent(ctrl, 'click', function() {
            this.dir = pos.charAt(0);
            this.move();
        }, this);
    }
    // 获取单个区块数据
    fn.getArea = function(i) {
        return this.areas[i];
    }
    // 获取空区块数组
    fn.getEmptyArea = function() {
        var result = [];
        this.map(function(area) {
            if (!area.elm) {
                result.push(area);
            }
        });
        return result;
    }
    // 区块是否为空
    fn.isAreaEmpty = function(i) {
        return !this.getArea(i).elm;
    }
    // 在剩余空区块中随机
    fn.randomIndex = function() {
        var i = Math.floor(Math.random() * this.count);
        if (this.isAreaEmpty(i)) {
            return i;
        } else {
            return arguments.callee.call(this);
        }
    }
    // 区块循环迭代
    fn.map = function(fn) {
        for (var i = 0; i < this.areas.length; i++) {
            fn.call(this, this.areas[i], i);
        }
    }
    // 新建一个有值磁块
    fn.newItem = function(debug) {
        var val = 2,
            i = debug || this.randomIndex(),
            area = this.getArea(i),
            elm = this.buildSquare(i);

            if (Math.random() * 10 > 6.5) {
                val = 4;
            }

        _setStyle(elm, {
            fontSize: '20px',
            color: '#fff'
        });
        area.val = val;
        area.elm = elm;
        this.renderVal(i);

        return area.elm;
    }
    // 渲染磁块值
    fn.renderVal = function(i) {
        var area = this.getArea(i);

        if (area.elm) {
            if (area.val) {
                _setText(area.elm, area.val);
            } else {
                this.doms.main.removeChild(area.elm);
            }
        } else {
            area.val = 0;
        }
    }
    // 渲染总分
    fn.renderScore = function() {
        _setText(this.doms.score, this.score);
    }
    // 检查是否结束
    fn.checkComplete = function() {
        if (this.complete) {
            window.alert('结束了，重新开始吧');
            this.reset();
        }
    }
    // 是否还有空白区块
    fn.hasEmptyArea = function() {
        var empty = false;
        this.map(function(area, i) {
            if (!area.elm) {
                empty = true;
            }
        });
        return empty;
    }
    // 是否还可移动
    fn.canMove = function() {
        return this.horizontalCanMove() || this.verticalCanMove();
    }
    // 水平可移动
    fn.horizontalCanMove = function() {
        var equal = false;
        for (var i = 0; i < this.matrix.length; i++) {
            var layer = this.matrix[i];
            layer.sort(function(a, b) {
                if (a.val === b.val) {
                   equal = true;
                }
                return a.index - b.index;
            });
        }
        return equal;
    }
    // 垂直可移动
    fn.verticalCanMove = function() {
        var equal = false;
        for (var i = 0; i < this.matrix.length; i++) {
            var layer = this.matrix[i],
                vLayer = [];
            for (var j = 0; j < layer.length; j++) {
                vLayer.push(i * layer.length + j);
            }
            vLayer.sort(function(a, b) {
                if (a.val === b.val) {
                   equal = true;
                }
                return a.index - b.index;
            });
        }
        return equal;
    }
    // 绑定事件
    fn.bindEvent = function() {
        _Drag(this.doms.main, this.DragEvent, this);
        _addEvent(document, 'keydown', this.keydownEvent, this);
    }
    fn.unBindEvent = function() {
        _Drag(this.doms.main);
        _removeEvent(document, 'keydown', this.keydownEvent);
    }
    fn.keydownEvent = function(evt) {
        var code = evt.keyCode || evt.charCode || evt.which;
        try {
            evt.returnVale = false;
        } catch(e) {
            evt.preventDefault();
        }
        switch(code) {
            case 37:
                this.dir = 'l';
            break;
            case 38:
                this.dir = 't';
            break;
            case 39:
                this.dir = 'r';
            break;
            case 40:
                this.dir = 'b';
            break;
        }
        this.move();
    }
    // 拖拽处理事件
    fn.DragEvent = function(data, evt) {
        switch(data.type) {
            case 'endDrag':
                if (Math.abs(data.dx) - Math.abs(data.dy) >= 0) {
                    this.dir = data.dx > 0 ? 'r' : 'l';
                } else {
                    this.dir = data.dy > 0 ? 'b' : 't';
                }
                if (Math.abs(data.dx) > 30 || Math.abs(data.dy) > 30) {
                    this.move();
                }
                document.body.style.cursor = 'default';
            break;
            case 'moveDrag':
                document.body.style.cursor = 'move';
            break;
        }
        return true;
    }
    // 移动
    fn.move = function() {
        if (this.moving) {
            return false;
        }
        this.moving = true;  // 上锁，防止连续触发
        this.moveCount = 0;  // 移动计数器
        switch(this.dir) {
            case 'l':
                this.moveLeft();
            break;
            case 'r':
                this.moveRight();
            break;
            case 't':
                this.moveTop();
            break;
            case 'b':
                this.moveBottom();
            break;
        }

        this.moveEnd();
    }
    // 移动结束
    fn.moveEnd = function() {
        this.renderScore();
        if (this.hasEmptyArea()) { // 如果有空区块，并且当前方向移动成功，则创建新磁块，否则为游戏结束
            if (this.moveCount) {
                this.newItem();
            }
            this.complete = !this.canMove(); // 不可移动，游戏也结束
        } else {
            this.complete = true;
        }
        this.checkComplete();
        this.moving = false;  // 解锁
        this.dir = null;
        this.moveCount = 0;   // 清空移动计数
    }
    fn.moveLeft = function() {
        var index,
            bottom,
            move,
            prev,
            origin,
            current,
            used,
            area,
            layer;

        for (var i = 0; i < this.matrix.length; i++) {
            layer = this.matrix[i];
            prev = -1;
            origin = -1;
            move = 0;
            used = false;
            bottom = this.matrix.length * i;
            for (var j = 0; j < layer.length; j++) {
                index = bottom + j;
                area = this.getArea(index);
                current = area.val;
                if (origin === current) {
                    move++;
                    used = true;
                }
                if(prev === 0) {
                    move++;
                }
                if (current) {
                    origin = current;
                }
                if (used) {
                    origin = -1;
                    user = false;
                }
                prev = current;
                this.singleMove(index, Math.max(bottom , index - move));
            }
        }
    }
    fn.moveRight = function() {
        var index,
            bottom,
            move,
            prev,
            origin,
            current,
            used,
            area,
            layer;

        for (var i = 0; i < this.matrix.length; i++) {
            layer = this.matrix[i];
            prev = -1;    // 上一个值
            origin = -1;  // 前一个不为0的值
            move = 0;     // 可移动距离
            used = false; // 上一个相等值是否使用过，防止连续三个相等
            bottom = layer.length * (i + 1) - 1; // 碰撞边缘
            for (var j = 0; j < layer.length; j++){
                index = bottom - j;             // 当前index
                area = this.getArea(index);
                current = area.val;            // 当前val
                if (origin === current) {      //如果连续两个值相等则
                    move++;
                    used = true;
                }
                if(prev === 0) {               // 上一个为空，直接移动
                    move++;
                }
                if (current) {                 // 当前值不为0则缓存
                    origin = current;
                }
                prev = current;                // 缓存当前值为前一个值
                if (used) {                    // 如果已使用，则设置为无效，并重置used
                    origin = -1;
                    user = false;
                }
                this.singleMove(index, Math.min(bottom , index + move));
            }
        }
    }
    fn.moveTop = function() {
        var index,
            bottom,
            move,
            prev,
            origin,
            current,
            used,
            area,
            layer;

        for (var i = 0; i < this.matrix.length; i++) {
            layer = this.matrix[i];
            prev = -1;
            origin = -1;
            move = 0;
            used = false;
            bottom = i;
            for (var j = 0; j < layer.length; j++) {
                index = j * this.matrix.length + bottom;
                area = this.getArea(index);
                current = area.val;
                if (origin === current) {
                    move += this.matrix.length;
                    used = true;
                }
                if(prev === 0) {
                    move += this.matrix.length;
                }
                if (current) {
                    origin = current;
                }
                prev = current;
                if (used) {
                    origin = -1;
                    user = false;
                }
                this.singleMove(index, Math.max(bottom , index - move));
            }
        }
    }
    fn.moveBottom = function() {
        var index,
            bottom,
            move,
            prev,
            origin,
            current,
            used,
            area,
            layer;

        for (var i = 0; i < this.matrix.length; i++) {
            layer = this.matrix[i];
            prev = -1;
            origin = -1;
            move = 0;
            used = false;
            bottom = (this.matrix.length - 1) * layer.length + i;
            for (var j = 0; j < layer.length; j++) {
                index = bottom - j * this.matrix.length;
                area = this.getArea(index);
                current = area.val;
                if (origin === current) {
                    move += this.matrix.length;
                    used = true;
                }
                if(prev === 0) {
                    move += this.matrix.length;
                }
                if (current) {
                    origin = current;
                }
                prev = current;
                if (used) {
                    origin = -1;
                    user = false;
                }
                this.singleMove(index, Math.min(bottom , index + move));
            }
        }
    }
    // 单个磁块移动处理
    fn.singleMove = function(fromIndex, toIndex) {
        var fromArea = this.getArea(fromIndex),
            toArea = this.getArea(toIndex);

        if (fromIndex === toIndex) {return;} //不能原位置移动

        if (fromArea.elm) { // 不能无元素移动
            toArea.val = toArea.val + fromArea.val; // 移向的val
            if (toArea.elm) {  // 如果移动到的地方有磁块则移除，并视为碰撞成功
                this.doms.main.removeChild(toArea.elm);
                this.score += toArea.val;
            }
            toArea.elm = fromArea.elm; // 给元素换主人
            _setStyle(toArea.elm, {
                left: toArea.left + 'px',
                top: toArea.top + 'px'
            });
            fromArea.elm = null;
            fromArea.val = 0;
            this.renderVal(toIndex);  // 渲染值
            this.moveCount++;
        }
    }
    // 开始
    fn.start = function() {
        this.newItem();
        this.newItem();
        this.renderScore();
    }

    window.h2048 = function(container) {
        return new C2048(container);
    }
})(window);