kao
===

一个简单的js文件加载和依赖管理方案
## 简介 ##

一个简单的js文件加载和依赖管理方案。依赖[mb.js](https://github.com/xwcoder/MessageBus)

初衷：
+   方便文件管理，控制文件粒度
+   实现无阻塞加载

原则：
+   避免做浏览器嗅探
+   不存在依赖关系使用并行下载
+   存在依赖关系使用串行下载
+   不使用setTimeout

## api ##

demo.html   main.js

### kao(config) ###

kao(function(){});  
kao(false, function(){});  
kao('jq_plugin/g.js', function(){});  
kao('mod1', function(){});  
kao('mod1', 'mod2', function(){});  
kao({path : 'js/g.js', requires : [], charset:'utf-8'}, function(){});  
kao('mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []}, function(){});  
kao(false, 'mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []});  
kao('mod3', function(){});  

### kao.add() ###

kao.add(name, 'js/jNav.js');  
kao.add(name, {path:'js/g.js', requires:[], charset : '', type : js});  

## v0.2 2013-07-24 ##

### 增加debug模式 ###

* 开启debug模式 方式一: kao.DEBUG = true;
* 开启debug模式 方式二: &lt;script src="kao.js" data-debug="true"&gt;&lt;/script&gt;
* debug模式会删除掉加载的script节点
* debug模式提供若干配置项, { debugConfig }
    * convert: url转换为对src文件的请求, 默认值为'all',  转换函数为converFn
        - 'all' : 所有url转换为对src&lt;源文件&gt;的请求
        - RegExp :  所有匹配此正则的url进行转换
        - function :  自定义函数，参数为原始url，返回值为true进行转换，false不转换
        - false : 不进行转换
    * convertFn : 转换函数
    * convertExclude: array，直接跳过不转换的url，数组项可以是以下值:
        - string : 直接与url做相等匹配
        - RegExp : url配置此正则则不转换
        - function : 自定义函数, 参数为原始url，返回值为true不进行转换, false进行转换
    &lt;convertExclude优先级高于convert&gt;
* kao.setDebugConfig: 对debug模式的参数进行设置


### 增加logger模块 ###

* kao.logger
    - kao.logger.group()
    - kao.logger.groupEnd()
    - kao.logger.log()
    - kao.logger.info()
    - kao.logger.error()
* 在浏览器提供console的情况下，使用console
* 浏览器未提供console的情况下，提供一个可拖动的弹窗输出debug信息
    * 在debug模式下才开启
    * 通过kao.logger.setStyle() 控制弹窗样式 (原计划想做拖拽放大/缩小，太重了)
* 未在win/ie下测试过。。。

## License ##

All directories and files are MIT Licensed.
