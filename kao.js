( function ( window, document ) {
    var mb = new MessageBus();
    var slice = Array.prototype.slice;
    var toString = Object.prototype.toString;
    var ext;
    var gid = 0;

    var getAnonyModuleName = function () {
        return 'kao-anony-mod' + ++gid;
    };
    
    var throwException = function ( msg ) {
        throw new Error( msg );
    };

    var script = function () {
        var scripts = document.getElementsByTagName( 'script' );
        var i = 0, len = scripts.length, script;
        var reg = /kao\.js(?=[\?#]|$)/;
        for ( ; i < len; i++ ) {
            script = scripts[ i ];
            if ( reg.exec( script.getAttribute( 'src' ) || '' ) ) {
                break;
            }
            script = null;
        }
        return script;
    }();

    var isScript = function ( filename ) {
        filename = filename || '';
        return !!/\.js(?=[\?#]|$)/i.exec( filename );
    };

    var isCss = function ( filename ) {
        filename = filename || '';
        return !!/\.css(?=[\?#]|$)/i.exec( filename );
    };

    var isFunction = function ( fn ) {
        return fn && toString.call( fn ) === '[object Function]';
    };

    var isString = function ( s ) {
        return s && toString.call( s ) === '[object String]';
    };

    var isArray = function ( a ) {
        return a && toString.call( a ) === '[object Array]';
    };

    var isObject = function ( o ) {
        return o && toString.call( o ) === '[object Object]';
    };

    var isRegExp = function ( o ) {
        return o && toString.call( o ) === '[object RegExp]';
    };


    var apply = function ( o, c ) {
        if ( o && c ) {
            for ( var p in c ) {
                o[ p ] = c[ p ];
            }
        }
    };

    var config = {
        baseURL : 'http://js.tv.itc.cn/',

        coreLib : 'http://js.tv.itc.cn/base/core/g13071501.js'
    };

    var debugConfig = {
        convert : 'all',
        convertFn : function ( url ) {

            var exclude = this.convertExclude;

            for ( var i = 0, len = exclude.length; i < len; i++ ) {
                if ( isString( exclude[ i ] ) && url == exclude[ i ]
                || isRegExp( exclude[ i ] ) && exclude[ i ].test( url)
                || isFunction( exclude[ i ] ) && exclude[ i ]( url ) ) {
                    return url;
                }
            }

            if ( /\.src\./.test( url ) ) {
                return url;
            }
            var reg = /\.(\d+)\.js(#|\?|\.|$)/; //core/g.13071501.js
            var m;
            if ( m = reg.exec( url ) ) {
                return url.replace( m[ 1 ], 'src' );
            }
            
            reg = /\w+?(\d+)\.js(#|\?|\.|$)/; //core/g13071501.js
            
            if ( m = reg.exec( url ) ) {
                return url.replace( m[ 1 ], '.src' );               
            }

            return url;
        },
        convertExclude : [
            'http://js.tv.itc.cn/base/core/j_1.7.2.js'
        ]
    };

    var loaded = {};

    var loading = {};

    var modules = {};
    
    var getModule = function ( name ) {
        var mod;
        if ( isString( name ) ) {
            mod = modules[ name ];
        }
        return mod;
    };

    var getUrl = function ( path ) {
        path = path || '';
        if ( !/^http(s)?:\/\//.exec( path ) ) {
            path = config.baseURL + path;
        }
        if ( kao.DEBUG && debugConfig.convert ) {
            if ( debugConfig.convert == 'all'
                || isRegExp( debugConfig.convert ) && debugConfig.convert.test( path )
                || isFunction( debugConfig.convert ) && debugConfig.convert( path ) ) {

                path = debugConfig.convertFn( path );
            }
        }
        return path;
    };

    var loadCss = function ( url, charset ) {
        var node = document.createElement( 'link' );
        node.setAttribute( 'type', 'text/css' );
        node.setAttribute( 'rel', 'stylesheet' );
        node.setAttribute( 'href', url );

        if ( charset ) {
            node.charset = charset;
        }
        
        script.parentNode.insertBefore( node, script );
    };

    var load = function ( modName, url, type, charset, fn ) {
        url = getUrl( url );
        var topic = url.replace( /[\/:]/g, '' );
        var node, sid;

        var iscss = type === 'css' || isCss(url);

        if ( iscss ) {
            loadCss( url, charset );
            return;
        }

        if ( loaded[ url ] ) {
            fn && fn();
            modName && mb.publish( modName );
            return;
        } else {
            sid = mb.subscribe( topic, function () {
                fn && fn();
                modName && mb.publish( modName );
            }, this, null, { execTime : 1 } );
        }

        if ( loading[ url ] ) {
            return;
        }
        
        loading[ url ] = 1;

        node = document.createElement( 'script' );
        node.setAttribute( 'type', 'text/javascript' );
        node.setAttribute( 'src', url );
        node.setAttribute( 'async', true );
        if ( charset ) {
          node.charset = charset;
        }

        node.onerror = function() {
            mb.unsubscribe(sid);
            loading[ url ] = 0;
            node.onerror = null;
        };
        var done = false;
        node.onload = node.onreadystatechange = function () {
            if ( !done && ( !this.readyState || this.readyState === 'loaded' 
                    || this.readyState === 'complete' ) ) {
                done = true;
                node.onload = node.onreadystatechange = null;

                loaded[ url ] = 1;
                loading[ url ] = 0;

                if ( !kao.DEBUG ) {
                    script.parentNode.removeChild( node );
                }
                mb.publish(topic);
            }
        };

        script.parentNode.insertBefore( node, script );
    };

    var loadOrder = function ( deps, fn ) {
        var modNames = createModules( deps );

        var modName, mod, i = 0;
        var sid;

        sid = mb.wait( modNames, function () {
            mb.unsubscribe( sid );
            fn && fn();
        }, this );

        while ( modName = modNames[ i++ ] ) {
            mod = getModule( modName );
            if ( mod.requires && mod.requires.length ) {
                loadOrder( mod.requires, ( function ( modName, mod ) {
                    return function () {
                        load( modName, mod.path, mod.type, mod.charset );
                    }   
                } )( modName, mod ) );
            } else {
                load( modName, mod.path, mod.type, mod.charset );
            }
        };
    };

    var createModules = function ( mods, names ) {
        names = names || [];
        var mod, name, i = 0;

        while ( mod = mods[ i++ ] ) {

            if ( isString( mod ) ) {

                if ( modules[ mod ] ) {

                    names.push( mod );

                } else if ( isScript( mod ) || isCss( mod ) ) {

                    name = getAnonyModuleName();
                    kao.add( name, { path : mod } );
                    names.push( name );

                }
            } else if ( isObject( mod ) && mod.path ) {

                name = getAnonyModuleName();
                kao.add( name, mod );
                names.push( name );
            } 
        }
        return names;
    };

    //kao(function(){});
    //kao(false, function(){});
    //kao('jq_plugin/g.js', function(){});
    //kao('mod1', function(){});
    //kao('mod1', 'mod2', function(){});
    //kao({path : 'js/g.js', requires : [], charset:'utf-8'}, function(){});
    //kao('mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []}, function(){});
    //kao(false, 'mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []});
    //kao('mod3', function(){});
    var kao = function () {
        
        if ( !modules[ 'kao-corelib' ] ) {
            modules[ 'kao-corelib' ] = { path : config.coreLib }
        }

        var args = slice.call( arguments ); 
        var fn;
        var requireCore = true;

        if ( args[ 0 ] === false ) {
            requireCore = args.shift();
        }
        
        if ( isFunction( args[ args.length - 1 ] ) ) {
            fn = args.pop();
        }

        if ( requireCore ) {
            load( 'kao-corelib', getModule( 'kao-corelib' ).path, null, null, ( function ( args, fn ) {
                return function () {
                    if ( !args || !args.length ) {
                        fn && fn();
                    } else {
                        loadOrder( args, fn );
                    }
                }
            } ) ( args, fn ) );
        } else {
            if ( !args || !args.length ) {
                fn && fn();
            } else {
                loadOrder( args, fn );
            }
        }
    };

    apply( kao, {
        //add(name, 'js/jNav.js');
        //add(name, {path:'js/g.js', requires:[], charset : '', type : js});
        add : function ( modName, config ) {
            var mod;
            if ( !isString( modName ) ) {
                return;
            }

            if ( isString( config ) ) {
                mod = { path : config };
            } else if ( isObject( config ) && config.path ) {
                mod = config;
            }

            if ( mod ) {
                modules[ modName ] = mod;
            }
        },

        setConfig : function ( o ) {
            apply( config, o );
        },

        DEBUG : false,

        setDebugConfig : function ( o ) {
            apply( debugConfig, o );
        }

    } );

    window.kao = kao;

    if ( ext = script.getAttribute('data-corelib') ) {
        config.coreLib = ext;
    }

    if ( ext = script.getAttribute( 'data-baseurl' ) ) {
        config.baseURL = ext;
    }

    if ( ( ext = script.getAttribute( 'data-debug' ) ) == 'true' ) {
        kao.DEBUG = true;
    }

    if ( ext = script.getAttribute( 'data-main' ) ) {
        if ( script.getAttribute('data-main-needcore' ) === 'false' ) {
            kao( false, ext );
        } else {
            kao( ext );
        }
    }
} )( window, document );

//kao-logger module
;( function ( window, document, kao ) {

    var pageBody = document.compatMode === 'CSS1Compat' ? document.documentElement : document.body;
    var slice = Array.prototype.slice;
    var panel, list, loggerInited;

    var initLogger = function () {
        var style = document.createElement( 'style' );
        style.type = 'text/css';

        var cssText = 
            '#kao-logger-panel {'
                + 'z-index:10000;'
                + 'position:absolute;'
                + 'top : 10px;'
                + 'left : 10px;'
                + 'width:500px;'
                + 'border:3px solid #06a7e1;'
            + '}'
            + '#kao-logger-panel-top{'
                + 'height:30px;'
                + 'background:#06a7e1;'
                + 'cursor:move;'
                + 'color:#fff;'
                + 'padding:0 10px;'
            + '}'
            + '#kao-logger-panel-body{'
                + 'height:300px;'
                + 'background:#fff;'
                + 'padding:10px;'
                + 'overflow:auto;'
            + '}'
            + '#kao-logger-list li{'
                + 'list-style:none;'
                + 'border-bottom:1px solid #f4f4f4;'
            + '}'
            + '#kao-logger-title{float:left;height:30px;line-height:30px;}'
            + '#kao-logger-menu{float:right;}'
            + '#kao-logger-menu .menu-item{'
                + 'height:30px;'
                + 'line-height:30px;'
                + 'color:#fff;'
                + 'float:left;'
                + 'display:block;'
                + 'margin-right:10px;'
            + '}'
            + '.kao-logger-info{color:#06a7e1}'
            + '.kao-logger-log{color:#3a3a3a;}'
            + '.kao-logger-error{color:#d80c18;}'
            + '.kao-logger-group{border:2px solid #06a7e1}';

        if ( style.styleSheet ) {
            style.styleSheet.cssText = cssText;
        } else {
            style.appendChild( document.createTextNode( cssText ) );
        }

        var head = document.getElementsByTagName( 'head' )[ 0 ];
        head.appendChild( style );


        panel = document.createElement( 'div' );
        panel.id = 'kao-logger-panel';
        document.body.insertBefore( panel, document.body.firstChild );
        panel.innerHTML = 
              '<div id="kao-logger-panel-top">'
                  + '<h1 id="kao-logger-title">kao-logger</h1>'
                  + '<div id="kao-logger-menu">'
                    + '<a id="kao-logger-btn-clear" class="menu-item" href="#" title="清空">清空</a>'
                    + '<a id="kao-logger-btn-close" class="menu-item" href="#" title="关闭">关闭</a>'
                  + '</div>'
            + '</div>'
            + '<div id="kao-logger-panel-body"><ul id="kao-logger-list"></ul></div>'
            + '<div id="kao-logger-panel-foot"></div>';
        
        list = document.getElementById( 'kao-logger-list' );
        var top = document.getElementById( 'kao-logger-panel-top' );
        var drag = false;
        top.onmousedown = function () {
            drag = true;
            event = event || window.event;

            var pageX = event.pageX || event.x;
            var pageY = event.pageY || event.y;

            var L = panel.offsetLeft;
            var T = panel.offsetTop;

            document.onmousemove = function ( event ) {
                event = event || window.event;
                if ( drag ) {
                    x = event.pageX || event.x;
                    y = event.pageY || event.y;

                    x = Math.max( x, 0 );
                    y = Math.max( y, 0 );
                    panel.style.left = ( L - pageX + x ) + 'px';
                    panel.style.top  = ( T - pageY + y ) + 'px';
                }
            };
            document.onmouseup = function () {
                drag = false;
            };
        };
        document.getElementById( 'kao-logger-btn-close' ).onclick = function () {
            panel.style.display = 'none';
        };
        document.getElementById( 'kao-logger-btn-clear' ).onclick = function () {
            list.innerHTML = '';    
        };

        loggerInited = true;
    };

    if ( window.console && window.console.log ) {
        kao.logger = {
            log : function () {
                console.log.apply( console, slice.call( arguments ) );
            },
            info : function () {
                console.info.apply( console, slice.call( arguments ) );
            },
            error : function () {
                console.error.apply( console, slice.call( arguments ) );
            },
            group : function () {
                console.group();
            },
            groupEnd : function () {
                console.groupEnd();
            }
        };
    } else {
        kao.logger = {
            log : function ( msg ) {
                if ( !kao.DEBUG ) {
                    return;
                }
                !loggerInited && initLogger();

                panel.style.display = 'block';
                list.innerHTML = list.innerHTML
                    + '<li class="kao-logger-log">' + msg + '</li>';
            },

            info : function ( msg ) {

                if ( !kao.DEBUG ) {
                    return;
                }
                !loggerInited && initLogger();

                panel.style.display = 'block';
                list.innerHTML = list.innerHTML 
                    + '<li class="kao-logger-info">' + msg + '</li>';
            },

            error : function ( msg ) {

                if ( !kao.DEBUG ) {
                    return;
                }
                !loggerInited && initLogger();

                panel.style.display = 'block';
                list.innerHTML = list.innerHTML 
                    + '<li class="kao-logger-error">' +  msg + '</li>';
            },
            group : function () {

                if ( !kao.DEBUG ) {
                    return;
                }
                !loggerInited && initLogger();

                panel.style.display = 'block';
                list.innerHTML = list.innerHTML 
                    + '<li class="kao-logger-group"></li>';
            },
            groupEnd : function () {

                if ( !kao.DEBUG ) {
                    return;
                }
                !loggerInited && initLogger();

                list.innerHTML = list.innerHTML 
                    + '<li class="kao-logger-group"></li>';
            }
        };
    } 

    kao.logger.setStyle = function ( styles ) {
        if ( typeof styles == 'object' && panel ) {
            for ( var p in styles ) {
                panel.style[ p ] = styles[ p ];
            }
        }
    };

} )( window, document, kao );
