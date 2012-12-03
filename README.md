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

### TODO ###
稍后做个PPT, 整理一下js文件的无阻塞加载
