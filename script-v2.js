function drawOrganizationChart(params) {
    listen();

	params.funcs.expandAll = expandAll;
    params.funcs.search = searchUsers;
    params.funcs.closeSearchBox = closeSearchBox;
    params.funcs.findInTree = findInTree;
    params.funcs.clearResult = clearResult;
    params.funcs.reflectResults = reflectResults;
    params.funcs.toggleFullScreen = toggleFullScreen;
    params.funcs.locate = locate;
    params.funcs.download = JSONdownload;
    params.funcs.rename_node = rename_node;
	params.funcs.create_node = create_node;
	params.funcs.fitToScreen = fitToScreen;
	params.funcs.collapseAll = collapseAll;
	params.funcs.expandAll = expandAll;

	var colorCategory = params.colorCategory;

    // var OrgTypesLevel1 = ['IDN'];
    // var OrgTypesLevel2 = ['IDN_Filled', 'OSUB'];
    // var OrgTypesLevel3 = ['IDN_Filled', 'HOSP', 'OSUB_Filled'];
    // var OrgTypesLevel4 = ['CLIN', 'PHAR', 'INDP', 'WHOL', 'UNSPEC', 'CLIN', 'RC', 'PAYR', 'INDP', 'PHAR', 'HMHLT', 'HOSP_Filled'];
    // var OrgTypesLevel5 = ['OUTLET'];
	var PAGINATION = 3;
	
	var OrgTypeLevel = {
		'All': 6,
		'IDN': 1,
		'IDN_Filled' : 2,
		'OSUB' : 2,
		'IDN_Filled' : 3,
		'HOSP' : 3,
		'OSUB_Filled' : 3,
		'CLIN': 4,
		'PHAR': 4,
		'INDP' : 4,
		'WHOL' : 4,
		'UNSPEC' : 4,
		'CLIN' : 4,
		'RC' : 4,
		'PAYR' : 4,
		'INDP' : 4,
		'PHAR' : 4,
		'HMHLT' : 4,
		'HOSP_Filled' : 4,
		'OUTLET' : 5
    }
    
    var OrgTypeImagePath = ['images/IDN_B.png', 'images/OSUB_B.png', 'images/Hospital_B.png', 'images/SOC_B.png', 'images/OUTLET_B.png', '']

	var selectedEntityLevel = OrgTypeLevel[params.entityType];
    var selectedNodeId = "";
    var selectedOriginalBackground = "";
    var create_node_modal_active = false;
    var rename_node_modal_active = false;
    var create_node_parent = null;
    var node_to_rename = null;
    var circularRemovedNode;

    var RelationSubtypeColors = params.relationColors;
    /*{
        "Filled": "slategrey",
        "Owned": "blue",
        "Affiliated Purchasing": "magenta",
        "Managed": "red",
        "Leased": "orange",
        "OWNERSHIP": "purple",
        "DEPARTMENT": "forestgreen",
        "OUTLET": "black"
    };*/

    var attrs = {
        EXPAND_SYMBOL: '+',
        COLLAPSE_SYMBOL: '-',
        selector: params.selector,
        root: params.data,
        index: 0,
        duration: 600,
        minMaxZoomProportions: [0.0005, 200],
        linkLineSize: 150,
        userIcon: '\uf0f8',
        nodeStroke: "teal",
        nodeStrokeWidth: '1px'
    }

    var dimens = {};
    // Element dimensions
    dimens.chartWidth = params.chartWidth;
    dimens.chartHeight = params.chartHeight;
    dimens.nodeWidth = ((params.chartWidth / 4) < 270)? (params.chartWidth / 4) : 270;
    dimens.nodeHeight = (80 * dimens.nodeWidth) / 270;    
    dimens.nodeEntityImageWidth = (dimens.nodeHeight * 100 / 190);
    dimens.nodePadding = dimens.nodeWidth / 30;
    dimens.nodeEntityImageHeight = (dimens.nodeHeight - 2 * dimens.nodePadding - 4);

    // Element paddings and dimensions
    
    dimens.rootNodeLeftMargin = params.chartWidth / 2;
    dimens.rootNodeTopMargin = 20;    
    dimens.nodeEntityNameTopmargin = (dimens.nodePadding + 10) 
    dimens.nodeEmpEntityNameTopmargin = ((dimens.nodeHeight / 1.5)) 
    dimens.nodeEmpCountTopMargin = parseInt((dimens.nodeHeight / 1.5) + ((11 * dimens.nodeWidth) / 270) + 5) ;
    dimens.nodeTextLeftMargin = dimens.nodeEntityImageWidth + 2 * dimens.nodePadding;

    // Element sizes
    dimens.collapseCircleRadius = dimens.nodeWidth / 30;
    dimens.nodeStrokeWidth = '1px';
    dimens.selectedNodeStrokeWidth = ((2.5 * dimens.nodeWidth) / 270) + 'px';

    // Font sizes
    dimens.collapsibleFontSize = 15;
    dimens.nodeEntityNameFontSize = ((12 * dimens.nodeWidth) / 270) + 'px';
    dimens.nodeEmpEntityNameFontSize = ((11 * dimens.nodeWidth) / 270) + 'px';
    dimens.nodeEmpCountFontSize = ((11 * dimens.nodeWidth) / 270) + 'px';
    dimens.sideBarTitleFontSize = ((18 * dimens.nodeWidth) / 270) + 'px';
    dimens.sideBarSubTitleFontSize = ((14 * dimens.nodeWidth) / 270) + 'px';
    dimens.sideBarContentFontSize = Math.ceil((14 * params.detailsSideBarWidth) / 300) + 'px';

	// Attributes related to individual nodes
    var colors = {}
	colors.nodeStroke = 'teal';
	colors.selectedNodeBackground = '#ffeeff';
	colors.filledNodeBackground = '#dedede';
    colors.unfilledNodeBackground = '#ffffff';
    
    // Handle legend contents
    for (var key in params.relationColors) {
        var style = `style="margin-left: 10px; font-size: ${((15 * dimens.nodeWidth) / 270)}px;"`
        
        if (key=='Filled') style = `style=" font-size: ${((15 * dimens.nodeWidth) / 270)}px;"`;
        
        document.getElementById('legend').innerHTML += `<li ${style}><span style="background-color: ${params.relationColors[key]}; height:5px; width: 15px; margin-top: 7px; margin-left: 5px;"></span> ${toTitleCase(key)}</li>`
    }

    var selectedNode = null;
	var draggingNode = null;
	
    // Panning variables
    var panSpeed = 200;
	var panBoundary = 20;

	var classifierData = {}

	// Gnerate required data structures for other operations
	function generateDataStructures(node, depth) {
		node.depth = depth;
		node.NET_PATIENT_REVENUE = parseFloat((Math.random() * 10).toFixed(2))
		node.NET_INCOME = parseFloat((Math.random() * 10).toFixed(2))
		node.NET_INCOME_MARGIN = parseFloat((Math.random() * 10).toFixed(2))

		var category = ['High', 'Medium', 'Low'];
		node.STRUCTURE_SEGMENT = category[(parseInt(node.NET_PATIENT_REVENUE) % 3)]
		node.PATIENT_EXPERIENCE_SEGEMENT = category[(parseInt(node.NET_INCOME) % 3)]
		node.QUALITY_SEGMENT = category[(parseInt(node.NET_INCOME_MARGIN) % 3)]
		node.RESEARCH_SEGEMENT = category[(parseInt(node.NET_PATIENT_REVENUE) % 3)]
		node.WILLINGNESS_TO_PATNER_SEGMENT = category[(parseInt(node.NET_INCOME) % 3)]
		node.EXPRESSION_SEGMENT = category[(parseInt(node.NET_INCOME_MARGIN) % 3)]

		if (!classifierData[node.ENTITY_ORG_TYPE]) {
			classifierData[node.ENTITY_ORG_TYPE] = {};
		}

		if (classifierData[node.ENTITY_ORG_TYPE][depth]) {
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_PATIENT_REVENUE.push(node.NET_PATIENT_REVENUE);
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME.push(node.NET_INCOME);
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME_MARGIN.push(node.NET_INCOME_MARGIN);
		}
		else {
			classifierData[node.ENTITY_ORG_TYPE][depth] = {};
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_PATIENT_REVENUE = [];
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME = [];
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME_MARGIN = [];

			classifierData[node.ENTITY_ORG_TYPE][depth].NET_PATIENT_REVENUE.push(node.NET_PATIENT_REVENUE);
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME.push(node.NET_INCOME);
			classifierData[node.ENTITY_ORG_TYPE][depth].NET_INCOME_MARGIN.push(node.NET_INCOME_MARGIN);
		}

		if(node.hasOwnProperty('children')) {
			for(var i=0; i<node.children.length; i+=1) {
				generateDataStructures(node['children'][i], depth + 1);
			}
		}
	}

	// Modify the generated data structures
	function modifyDataStrucutres() {		
		var keys = Object.keys(classifierData);
		for (var i=0; i<keys.length; i+=1) {
			var depthKeys =  Object.keys(classifierData[keys[i]]);

			for(var j=0;j<depthKeys.length; j+=1) {
				classifierData[keys[i]][depthKeys[j]].NET_PATIENT_REVENUE.sort();
				classifierData[keys[i]][depthKeys[j]].NET_INCOME.sort();
				classifierData[keys[i]][depthKeys[j]].NET_INCOME_MARGIN.sort();
			}
		}
	}
	
	generateDataStructures(attrs.root, 0)
	modifyDataStrucutres();

    var tree = d3.layout.tree().nodeSize([dimens.nodeWidth + 40, dimens.nodeHeight])
                .separation(function(a, b) {
        return a.parent == b.parent ? 1 : 1.15;
    });

    // Draws links from source node to destination node
    function drawLink(source, target) {
        const x = source.x + dimens.nodeWidth / 2;
        const y = source.y + dimens.nodeHeight / 2;
        const ex = target.x + dimens.nodeWidth / 2;
        const ey = target.y + dimens.nodeHeight / 2;

        let xrvs = ex - x < 0 ? -1 : 1;
        let yrvs = ey - y < 0 ? -1 : 1;

        let rdef = 35;
        let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

        r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

        let h = Math.abs(ey - y) / 2 - r;
        let w = Math.abs(ex - x) - r * 2;
        //w=0;
        const path = `
            M ${x} ${y}
            L ${x} ${y + h * yrvs}
            C  ${x} ${y + (h + r) * yrvs} ${x} ${y + (h + r) * yrvs} ${x + r * xrvs} ${y + (h + r) * yrvs}
            L ${x + (w + r) * xrvs} ${y + (h + r) * yrvs}
            C  ${ex}  ${y + (h + r) * yrvs} ${ex}  ${y + (h + r) * yrvs} ${ex} ${ey - h * yrvs}
            L ${ex} ${ey}`
        return path;
    }

    var zoomBehaviours = d3.behavior
        .zoom()
        .scaleExtent(attrs.minMaxZoomProportions)
        .on("zoom", redraw);

    d3.selection.prototype.appendHTML =
    d3.selection.enter.prototype.appendHTML = function(HTMLString) {
        return this.select(function() {
            return this.appendChild(document.importNode(new DOMParser().parseFromString(HTMLString, 'text/html').body.childNodes[0], true));
        });
    };

    d3.selection.prototype.appendSVG =
    d3.selection.enter.prototype.appendSVG = function(SVGString) {
        return this.select(function() {
            return this.appendChild(document.importNode(new DOMParser()
            .parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + SVGString + '</svg>', 'application/xml').documentElement.firstChild, true));
        });
    };
    
    var svg = d3.select(attrs.selector)
		.append("svg")
		.attr('id', 'svgDiv')
        .attr("width", dimens.chartWidth)
		.attr("height", dimens.chartHeight)
		.attr("viewBox", "0 0 " + dimens.chartWidth + " " + dimens.chartHeight )
		.attr("preserveAspectRatio", "xMinYMin meet")
        .attr("margin-left", (window.innerWidth - dimens.chartWidth))
        .attr("top", 0)
        .call(zoomBehaviours)
		.append("g")
		.attr('id', 'drawArea')
        .attr("transform", "translate(" + dimens.chartWidth / 2 + "," + 20 + ")");
        // filters go in defs element
   
    zoomBehaviours.translate([dimens.rootNodeLeftMargin, dimens.rootNodeTopMargin]);

    attrs.root.x0 = 0;
    attrs.root.y0 = dimens.rootNodeLeftMargin;
    if (params.mode != 'department') {
        
        // adding unique values to each node recursively		
        var uniq = 1;
        addPropertyRecursive('uniqueIdentifier', function (v) {
            return uniq++;
        }, attrs.root);
	}

    attrs.root = JSON.parse(JSON.stringify(attrs.root).replace(/"children":/g, '"kids":'));
	
	function addPageno(d) {
        if (d && d.kids) {
            d.page = 1;
            d.children = [];            
            d.kids.forEach(function (d1, i) {
              
                d1.pageNo = Math.ceil((i + 1) / PAGINATION);
                if (d.page === d1.pageNo) {
                    d.children.push(d1)
                }
                addPageno(d1);
            })
        }
	}
	
    addPageno(attrs.root) 
    
    expand(attrs.root);
    
    if (attrs.root.children) {
        attrs.root.children.forEach(collapse);
    }

	update(attrs.root);
	
    d3.select(attrs.selector).style("height", dimens.chartHeight);

    var tooltip = d3.select('body')
        .append('div')
        .attr('class', 'customTooltip-wrapper');

    var sidebar = d3.select('body')
        .append('div')
        .attr('class', 'sidebar-wrapper');
    var dragStarted = null;

    function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    function create_node() {
        if (create_node_parent && create_node_modal_active) {
            if (create_node_parent._children != null) {
                create_node_parent.children = create_node_parent._children;
                create_node_parent._children = null;
            }
            if (create_node_parent.children == null) {
                create_node_parent.children = [];
            }
            id = generateUUID();
            name = $('#CreateNodeName').val();
            new_node = {
                "REL_TYPE": "Filled",
                "REL_SUBTYPE": "Filled",
                "ENTITY_ID": 17773320,
                "NO_OF_OSUBS": 3,
                "id": id,
                "NO_OF_HOSPS": 9,
                "NO_OF_SOCS": 269,
                "NO_OF_OUTLETS": 46,
                "ENTITY_NAME": $('#createChildName').val(),
                "ENTITY_TYPE": "CORP",
                "ENTITY_ORG_TYPE": "OUTLET",
                "ENTITY_ORG_SUBTYPE": "UNSPEC",
                "ENTITY_ADDR1": "1800 ORLEANS ST",
                "ENTITY_CITY": "BALTIMORE",
                "ENTITY_STATE": "MD",
                "ENTITY_ZIP": 21287,
                "ENTITY_340B_FLAG": "N",
                "ENTITY_SREP_ACCESS": "N",
                "children": null
            };
            create_node_parent.children.push(new_node);
            create_node_modal_active = false;
            $('#CreateNodeName').val('');

        }
        update(create_node_parent);
    }

    function rename_node() {
        if (node_to_rename && rename_node_modal_active) {
            name = $('#RenameNodeName').val();
            node_to_rename.ENTITY_NAME = name;
            rename_node_modal_active = false;

        }
        update(attrs.root);
	}
	
	function getColorCategory(node) {
		var parameter = '';

		switch (parseInt(params.colorBy)) {
			case 1: parameter = 'NET_PATIENT_REVENUE'; break;
			case 2: parameter = 'NET_INCOME'; break;
			case 3: parameter = 'NET_INCOME_MARGIN'; break;
			case 4: parameter = 'STRUCTURE_SEGMENT'; break;
			case 5: parameter = 'PATIENT_EXPERIENCE_SEGEMENT'; break;
			case 6: parameter = 'QUALITY_SEGMENT'; break;
			case 7: parameter = 'RESEARCH_SEGEMENT'; break;
			case 8: parameter = 'WILLINGNESS_TO_PATNER_SEGMENT'; break;
			case 9: parameter = 'EXPRESSION_SEGMENT'; break;
		}

		if (!node[parameter]) return colors.unfilledNodeBackground;

		if(typeof node[parameter] == 'string') {
			return colorCategory[node[parameter].toLowerCase()]
		}
		else {
			var valueArray = classifierData[node.ENTITY_ORG_TYPE][node.depth][parameter];
			var size = valueArray.length;
			
			if (size == 1) { return colorCategory.high }
			else if(size == 2) {
				if (node[parameter] == valueArray[0]) { return colorCategory.low; }
				else { return colorCategory.high; }
			}
			else {
				if (node[parameter] <= valueArray[Math.round(size / 3)]) { return colorCategory.low; }
				else if (node[parameter] <= valueArray[Math.round((size * 2) / 3)]) { return colorCategory.medium; }
				else { return colorCategory.high; }
			}
		}
	}

    outer_update = null
    function update(source, param, locate=false) {

        var menu = [
            {
                title: 'Rename node',
                action: function (elm, d, i) {
                    $("#RenameNodeName").val(d.name);
                    rename_node_modal_active = true;
                    node_to_rename = d
                    $('#RenameNodeModal').modal('show');
                }
            },
            {
                title: 'Delete node',
                action: function (elm, d, i) {
                    delete_node(d);
                }
            },
            {
                title: 'Create child node',
                action: function (elm, d, i) {
                    create_node_parent = d;
                    create_node_modal_active = true;
                    $('#CreateNodeModal').modal('show');
                }
            }
		]
		
        function delete_node(node) {
            visit(source, function (d) {
                if (d.children) {
                    for (var child of d.children) {
                        if (child == node) {
                            d.children = d.children.filter(value => value != 0 && value != child)
                            update(attrs.root);
                            break;
                        }
                    }
                }
            },
            function (d) {
                return d.children && d.children.length > 0 ? d.children : null;
            });
		}
		
        const getCircularReplacer = (deletePorperties) => { //func that allows a circular json to be stringified
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (deletePorperties) {
                        delete value.x0;
                        delete value.y0;
                        delete value.y;
                        delete value.x;
                        delete value.depth;
                        delete value.size;
                    }
                    if (seen.has(value)) {
                        return;
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        var myRoot = JSON.stringify(attrs.root, getCircularReplacer(false)); //Stringify a first time to clone the root object (it's allow you to delete properties you don't want to save)
        var myvar = JSON.parse(myRoot);
        
        circularRemovedNode = JSON.stringify(myvar, getCircularReplacer(true)); //Stringify a second time to delete the properties you don't need

        function pan(domNode, direction) {
            var speed = panSpeed;
            if (panTimer) {
                clearTimeout(panTimer);
                translateCoords = d3.transform(svg.attr("transform"));
                if (direction == 'left' || direction == 'right') {
                    translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                    translateY = translateCoords.translate[1];
				} 
				else if (direction == 'up' || direction == 'down') {
                    translateX = translateCoords.translate[0];
                    translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
                }
                scaleX = translateCoords.scale[0];
                scaleY = translateCoords.scale[1];
                scale = zoomListener.scale();
				
				svg.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
                d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
                zoomListener.scale(zoomListener.scale());
                zoomListener.translate([translateX, translateY]);
                panTimer = setTimeout(function () {
                    pan(domNode, speed, direction);
                }, 50);
            }
        }

        function initiateDrag(d, domNode) {
            draggingNode = d;
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
            d3.select(domNode).attr('class', 'node activeDrag');

            svg.selectAll("g.node").sort(function (a, b) { // select the parent and sort the path's
                if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
                else return -1; // a is the hovered element, bring "a" to the front
            });
            // if nodes has children, remove the links and nodes
            if (nodes.length > 1) {
                // remove link paths
                links = tree.links(nodes);
                nodePaths = svg.selectAll("path.link")
                    .data(links, function (d) {
                        return d.target.id;
                    }).remove();
                // remove child nodes
                nodesExit = svg.selectAll("g.node")
                    .data(nodes, function (d) {
                        return d.id;
					})
					.filter(function (d, i) {
                        if (d.id == draggingNode.id) {
                            return false;
                        }
                        return true;
					})
					.remove();
            }

            // remove parent link
            parentLink = tree.links(tree.nodes(draggingNode.parent));
            svg.selectAll('path.link').filter(function (d, i) {
                if (d.target.id == draggingNode.id) {
                    return true;
                }
                return false;
            }).remove();

            dragStarted = null;
        }
        var dragListener = d3.behavior.drag()
            .on("dragstart", function (d) {
                if (d == attrs.root) {
                    return;
                }
                dragStarted = true;
                nodes = tree.nodes(d);
                d3.event.sourceEvent.stopPropagation()
            })
            .on("drag", function (d) {
                // this is hardcoded for now
                // found it to be the best way
                // don't trigger d3 if the event source is from the collapsed wrapper
                // I believe there are better ways to handle this like event.stoppropagation and event.preventdefault
                // see test-dragndrop.html for a basic example
                if (["text-collapse", "node-collapse", "node-collapse-right-rect"].includes(d3.event.sourceEvent.srcElement.className.baseVal)) {
                    return;
                }
                if (d == attrs.root) {
                    return;
                }
                if (dragStarted) {
                    domNode = this;
                    initiateDrag(d, domNode);
                }
                relCoords = d3.mouse($('svg').get(0));
                if (relCoords[0] < panBoundary) {
                    panTimer = true;
                    pan(this, 'left');
                } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                    panTimer = true;
                    pan(this, 'right');
                } else if (relCoords[1] < panBoundary) {
                    panTimer = true;
                    pan(this, 'up');
                } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                    panTimer = true;
                    pan(this, 'down');
                } else {
                    try {
                        clearTimeout(panTimer);
                    } catch (e) {

                    }
                }
                d.x0 += d3.event.dx;
                d.y0 += d3.event.dy;
                var node = d3.select(this);
                
                node.attr("transform", "translate(" + d.x0 + "," + d.y0 + ")")
            })
            .on("dragend", function (d) {
                if (d == attrs.root) {
                    return;
                }
                domNode = this;
                if (selectedNode) {
                    // now remove the element from the parent, and insert it into the new elements children
                    var index = draggingNode.parent.children.indexOf(draggingNode);
                    if (index > -1) {
                        draggingNode.parent.children.splice(index, 1);
                    }
                    if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                        if (typeof selectedNode.children !== 'undefined') {
                            selectedNode.children.push(draggingNode);
                        } else {
                            selectedNode._children.push(draggingNode);
                        }
                    } else {
                        selectedNode.children = [];
                        selectedNode.children.push(draggingNode);
                    }
                    // Make sure that the node being added to is expanded so user can see added node is correctly moved
                    endDrag();
				} 
				else {
                    endDrag();
                }
            });
        function endDrag() {
            selectedNode = null;
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
            d3.select(domNode).attr('class', 'node');
            // now restore the mouseover event or we won't be able to drag a 2nd time
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
            updateTempConnector();
            if (draggingNode !== null) {
                update(attrs.root);
                draggingNode = null;
            }
        }

        // Compute the new tree layout.
        var nodes = tree.nodes(attrs.root)
            .reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
			d.y = d.depth * attrs.linkLineSize;
        });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++attrs.index);
            })

        var nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .call(dragListener)
            .attr("transform", function (d) {
                if(param && param.parent_page){
                    return ("translate("+param.parent_page[0]+","+ param.parent_page[1]+")")
                }
                return "translate(" + source.x0 + "," + source.y0 + ")";
            })

        var nodeGroup = nodeEnter.append("g")
            .attr("class", "node-group")            

        // Add parent rectangle to the node
        nodeGroup.append("rect")
            .attr("width", dimens.nodeWidth)
            .attr("height", dimens.nodeHeight)
            .attr("id", function(d) {
            	return ('N' + d.uniqueIdentifier);
            })
            .attr("data-node-group-id", function (d) {
                return d.uniqueIdentifier;
            })
            .attr('rx', '.5rem')
            .attr("fill", function (d) {
				var cl = ""
				if (params.colorBy < 1) {
					if (d.ENTITY_NAME.startsWith("(Filled)")) {
						return colors.filledNodeBackground
					}
					else {
						return colors.unfilledNodeBackground
					}
				}
				else {
					return getColorCategory(d);
				}
            })
            .attr("class", function (d) {
                var res = "";
                if (d.isLoggedUser) res += 'nodeRepresentsCurrentUser ';
                res += d._children || d.children ? "nodeHasChildren" : "nodeDoesNotHaveChildren";
                return res;
			});
			
        nodeGroup.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
            .style("fill", "blue")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function (node) {
                overCircle(node);
            })
            .on("mouseout", function (node) {
                outCircle(node);
			});
			
        // Add entity name text to the node
        nodeGroup.append("text")
        	.attr('id', function(d) {
            	return ('N' + d.uniqueIdentifier +"name");
            })
            .attr("x", dimens.nodeTextLeftMargin)
            .attr("y", dimens.nodeEntityNameTopmargin)
            .attr('class', 'entity-name')
            .style('font-size', dimens.nodeEntityNameFontSize)
            .attr("text-anchor", "left")
            .style('word-break', 'break-all')
            .text(function (d) {
                return toTitleCase(d.ENTITY_NAME.toLowerCase()).trim();
            })
            .call(wrap, (200 * dimens.nodeWidth) / 270);

        // Add entity type to the node
        nodeGroup.append("text")
            .attr("x", dimens.nodeTextLeftMargin)
            .attr("y", dimens.nodeEmpEntityNameTopmargin)
            .attr('class', 'emp-position-name')
            .style('font-size', dimens.nodeEmpEntityNameFontSize)
            .attr("dy", ".35em")
            .attr("text-anchor", "left")
            .text(function (d) {
                var position = d.ENTITY_ORG_TYPE.substring(0, 27);
                if (position.length < d.ENTITY_ORG_TYPE.length) {
                    position = position.substring(0, 24) + '...'
				}

				if (OrgTypeLevel[position] < selectedEntityLevel) {
					var collapsiblesWrapper = nodeEnter.append('g')
					.attr('class', 'collapsible-circle')
					.attr('data-id', function (v) {
						return v.uniqueIdentifier;
					});
	
				var collapsibles =
					collapsiblesWrapper.append("circle")
						.attr('class', 'node-collapse')
						.attr('cx', dimens.nodeWidth/2)
						.attr('cy', dimens.nodeHeight)
						.attr("", setCollapsibleSymbolProperty);
	
				//hide collapse rect when node does not have children
				collapsibles.attr("r", function (d) {
					if (d.children || d._children) return ((dimens.collapseCircleRadius * dimens.nodeWidth) / 270);
					return 0;
				})
				.attr("height", ((dimens.collapseCircleRadius * dimens.nodeWidth) / 270))
	
				collapsiblesWrapper.append("text")
					.attr('class', 'text-collapse')
					.attr("x", dimens.nodeWidth/2 )
					.attr('y', dimens.nodeHeight + ((4.5 * dimens.nodeWidth) / 270))
					.attr('width', ((dimens.collapseCircleRadius * dimens.nodeWidth) / 270))
					.attr('height', ((dimens.collapseCircleRadius * dimens.nodeWidth) / 270))
					.style('font-size', ((dimens.collapsibleFontSize * dimens.nodeWidth) / 270))
					.attr("text-anchor", "middle")
					.style('font-family', 'Fira Code')
					.style('font-weight', '500')
					.text(function (d) {
						return d.collapseText;
					})
	
				collapsiblesWrapper.on("click", click);
			}

            return position;
		})

        // Add children count icon to the node
        nodeGroup.append("text")
            .attr("x", dimens.nodeTextLeftMargin)
            .attr("y", dimens.nodeEmpCountTopMargin)
            .attr('class', 'emp-count-icon')
            .attr("text-anchor", "left")
            .style('font-family', 'FontAwesome')
            .style('font-size', dimens.nodeEmpCountFontSize)
            .text(function (d) {
                if (d.children || d._children) return attrs.userIcon;
            });

        // Add children count to the node
        nodeGroup.append("text")
            .attr("x", dimens.nodeTextLeftMargin + ((13 * dimens.nodeWidth) / 270))
            .attr("y", dimens.nodeEmpCountTopMargin)
            .attr('class', 'emp-count')
            .style('font-size', dimens.nodeEmpCountFontSize)
            .attr("text-anchor", "left")

            .text(function (d) {
                if(d.kids ){
                return d.kids.length }                
            })

        // Add the entity type icon to the node
        nodeGroup.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("id", "clip-rect")
            .attr("rx", 3)
            .attr('x', dimens.nodePadding)
            .attr('y', 2 + dimens.nodePadding)
            .attr('width', dimens.nodeEntityImageWidth)
            .attr('fill', 'none')
            .attr('height', dimens.nodeEntityImageHeight)

        nodeGroup.append("svg:image")
            .attr('x', dimens.nodePadding)
            .attr('y', 2 + dimens.nodePadding)
            .attr('width', dimens.nodeEntityImageWidth)
            .attr('height', dimens.nodeEntityImageHeight)
            .attr('clip-path', "url(#clip)")
            .attr("xlink:href", function (v) {
                
                return CheckOrgTypeReturnImage(v)
            })

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(attrs.duration)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })

        //todo replace with attrs object
        nodeUpdate.select("rect")
            .attr("width", dimens.nodeWidth)
            .attr("height", dimens.nodeHeight)
            .attr('rx', 3)
            .attr("stroke", function (d) {
                if (param && d.uniqueIdentifier == param.locate) {
                }
                else {
                	return colors.nodeStroke;
            	}
            })
            .attr('stroke-width', function (d) {
                if (param && d.uniqueIdentifier == param.locate) {
                    return "1px";
                }
                return dimens.nodeStrokeWidth
            })

        var nodeExit = node.exit()
            .attr('opacity', 1)
            .transition()
            .duration(attrs.duration)
            .attr("transform", function (d) {
                if(param && param.parent_page){
                    return ("translate("+param.parent_page[0]+","+ param.parent_page[1]+")")
                }
                return ('translate(' + source.x + ',' + source.y + ')')                
            })
            .each('end', function() {
                d3.select(this).remove();
            })
            .attr('opacity', 0);
  
        nodeExit.select("rect")
            .attr("width", dimens.nodeWidth)
            .attr("height", dimens.nodeHeight)

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function (d) {
                return d.target.id;
            });
        var color_rgb = ["red", "green", "blue"]
        var stroke_random = ["1px", "2px", "3px"]

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("x", dimens.nodeWidth / 2)
            .attr("y", dimens.nodeHeight / 2)
            .attr("stroke", function (d) {                
                return RelationSubtypeColors[d.target.REL_TYPE]
            })
            .attr("stroke-width", function (d) {
                return "2px";
            })
            .attr("d", function (d) {
                if(param && param.parent_page){
                    var o = {
                        x: param.parent_page[0],
                        y: param.parent_page[1]
                    };
                    return drawLink(o,o)
                }
                var o = {
                    x: source.x,
                    y: source.y
                };
                return drawLink(o,o);
            });

        // Transition links to their new position.
        link.transition()
            .duration(attrs.duration)
            .attr("d", d => drawLink(d.source,d.target));

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(attrs.duration)
            .attr("d", function (d) {
                if(param && param.parent_page){
                    var o = {
                        x: param.parent_page[0],
                        y: param.parent_page[1]
                    };
                    return drawLink(o,o)
                }
                var o = {
                    x: source.x,
                    y: source.y
                };
                return drawLink(o,o);
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        
        var parents = nodes.filter(function(d) {
            return (d.kids && d.kids.length > PAGINATION) ? true : false;
          });
        svg.selectAll(".page").remove();
        svg.selectAll(".page-text").remove();
        parents.forEach(function(p) {
            if (p._children)
              	return;
            var currPar = Object.assign({}, p);//helper for left right navigation position

            var pagingData = [];
            var pageTextData = [];

            if (p.page > 1) {
              	pagingData.push({
                	type: "prev",
                	parent: p,
                	no: (p.page - 1)
              	});
            }
            if (p.page < Math.ceil(p.kids.length / PAGINATION)) {
              	pagingData.push({
                	type: "next",
                	parent: p,
                	no: (p.page + 1)
              	});
            }
            if (p.children && p.kids) {
                pageTextData.push({
                	currPage: p.page,
                	TotalPage: Math.ceil(p.kids.length / PAGINATION)
              	});
            }
            
            var pageControl = svg.selectAll(".page")
              	.data(pagingData, function(d) {
                	return (d.parent.id + d.type);
              	}).enter()
              	.append("g")
              	.attr("class", "page")
              	.attr("transform", function(d) {
                	var x = (d.type == "next") ? currPar.x + ((260 * dimens.nodeWidth) / 270) : currPar.x + ((10 * dimens.nodeWidth) / 270);
                	var y = currPar.y + ((97 * dimens.nodeWidth) / 270);
                	return "translate(" + x + "," + y + ")";
				})
				.on("click", paginate);
          
            pageControl
              	.append("circle")
              	.attr("r", ((13 * dimens.nodeWidth) / 270))
              	.style("fill", "#eeeeee");
            pageControl
              	.append("image")
              	.attr("xlink:href", function(d) {
                	if (d.type == "next") { return "next_2.svg" } 
					else { return "prev_2.svg" }
              	})
              	.attr("x", ((-7 * dimens.nodeWidth) / 270))
              	.attr("y", ((-7 * dimens.nodeWidth) / 270))
              	.attr("width", ((15 * dimens.nodeWidth) / 270))
              	.attr("height", ((15 * dimens.nodeWidth) / 270));

			var pageTextControl = svg.selectAll(".page-text")
            	.data(pageTextData)
            	.enter()
            	.append("g")
            	.attr("class", "page-text")
           		.attr("transform", function(d) {
					var x = currPar.x + ((150 * dimens.nodeWidth) / 270); 
    		        var y = currPar.y + ((100 * dimens.nodeWidth) / 270);
	        	    return "translate(" + x + "," + y + ")";
            	})
			
            pageTextControl.append("text")
                .style('font-size', ((14 * dimens.nodeWidth) / 270))
            	.text(function (d) {
            		return "Page "+d.currPage +" / "+d.TotalPage
        		})
        });
          
        function paginate(d,) {
            d.parent.page = d.no;
            
            setPage(d.parent);
            update(attrs.root,{
                parent_page: [d.parent.x0,d.parent.y0]
            });
        }
		
		function setPage(d) {
            if (d && d.kids) {
              	d.children = [];
              	d.kids.forEach(function(d1, i) {
					if (d.page === d1.pageNo) {
						collapse(d1)
						
						d.children.push(d1);
					}
              	})
            }
        }

        if (param && param.centerMySelf) {
            var x;
            var y;

            nodes.forEach(function (d) {
                if (d.isLoggedUser) {
                    x = d.x;
                    y = d.y;
                }
            });

            // normalize for width/height
            var new_x = ((window.innerWidth / 2) - x);
            var new_y = ((window.innerHeight / 2) - y);

            // move the main container g
            svg.attr("transform", "translate(" + new_x + "," + new_y + ")")
            zoomBehaviours.translate([new_x, new_y]);
            zoomBehaviours.scale(1);
        }

		// Returns html script for the details sidebar
        function sideBarContent(item) {
            var addvar = item.ENTITY_ADDR1 + ', ' + item.ENTITY_STATE + ', ' + item.ENTITY_CITY + ', ' + item.ENTITY_ZIP;

            var strVar = '';
            strVar += `<div class="ui card sidebarcard">`
            strVar += `		<div class="content">`
            strVar += `			<img class="left floated mini ui image" src="https://semantic-ui.com/images/avatar/large/elliot.jpg" style="height:  30px;">`
            strVar += `			<div class="header" style="font-size: ${dimens.sideBarTitleFontSize};">${toTitleCase(item.ENTITY_NAME)}</div>`
            strVar += `			<div class="meta" style="font-size: ${dimens.sideBarSubTitleFontSize}">${item.ENTITY_ORG_TYPE}</div>`
            strVar += `			<div><address> <a style="font-size: ${dimens.sideBarSubTitleFontSize};" target="_blank" href="https://maps.google.com/?q=${addvar}">${addvar}</a> </address></div>`
            strVar += `			<div class="ui divider"></div><div class="description">`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Net Patient Revenue </span> <span class= "right-float"><b>$ ${item.NET_PATIENT_REVENUE}B</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Net Income: </span> <span class= "right-float"><b>$ ${item.NET_INCOME} B</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Net Income Margin: </span> <span class= "right-float"><b>$ ${item.NET_INCOME_MARGIN} B</b></span> </div>`
            strVar += `				<div class="ui divider"></div>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">No of Employed Physicians  </span> <span class= "right-float"><b>342</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">No of Affiliated OSUBs </span> <span class= "right-float"><b>${item.NO_OF_OSUBS}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">No of Affiliated Hospitals </span> <span class= "right-float"><b>${item.NO_OF_HOSPS}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">No of Affiliated SOCs </span> <span class= "right-float"><b>${item.NO_OF_SOCS}</b></span> </div>`
            strVar += `				<div class="ui divider"></div>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Structure Segment: </span> <span class= "right-float"><b>${item.STRUCTURE_SEGMENT}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Patient Experience Segment: </span> <span class= "right-float"><b>${item.PATIENT_EXPERIENCE_SEGEMENT}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Quality Segment: </span> <span class= "right-float"><b>${item.QUALITY_SEGMENT}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Research Segment: </span> <span class= "right-float"><b>${item.RESEARCH_SEGEMENT}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Willingness to Partner Segment: </span> <span class= "right-float"><b>${item.WILLINGNESS_TO_PATNER_SEGMENT}</b></span> </div><br>`
            strVar += `				<div style="font-size: ${dimens.sideBarContentFontSize};">Expression Segment: </span> <span class= "right-float"><b>${item.EXPRESSION_SEGMENT}</b></span> </div>`
            strVar += `		</div>`
            strVar += `</div>`

            return strVar
		}
		
		// Returns HTML script for tooltip
        function tooltipContent(item) {
            var strVar = '';
            strVar += `<div class="ui card">`
            strVar += `		<div class="content">`
            strVar += `			<img class="right floated mini ui image" src="https://semantic-ui.com/images/avatar/large/elliot.jpg" style="height:  30px;">`
            strVar += `			<div class="header">${toTitleCase(item.ENTITY_NAME)}</div>`
            strVar += `			<div class="meta">${item.ENTITY_ORG_TYPE}</div>`
            strVar += `			<div class="">${item.ENTITY_ADDR1}, ${item.ENTITY_STATE}, ${item.ENTITY_CITY}, ${item.ENTITY_ZIP}</div>`
            strVar += `			<br>`
            strVar += `			<div class="">Relationship: ${item.REL_TYPE}-${item.REL_SUBTYPE}</div>`
            strVar += `			<br>`
            strVar += `			<div class="">Rep Access: ${item.ENTITY_SREP_ACCESS}</div>`
            strVar += `		</div>`
            strVar += `		<div class="extra content">`
            strVar += `			<div class="ui small horizontal list">`
            strVar += `			<div class="item"><div class="header">${item.NO_OF_HOSPS} HOSPS</div></div>`
            strVar += `			<div class="item"><div class="header">${item.NO_OF_OUTLETS} OUTLETS</div></div>`
            strVar += `			<div class="item"><div class="header">${item.NO_OF_SOCS} SOCS</div></div>`
            strVar += `			<div class="item"><div class="header">${item.NO_OF_OSUBS} OSUBS</div></div>`
            strVar += `		</div>`
            strVar += `</div>`

            return strVar;
        }

        function tooltipHoverHandler(d) {
            var content = tooltipContent(d);
            tooltip.html(content);

            tooltip.transition()
                .duration(200).style("opacity", "1").style('display', 'block');
            d3.select(this).attr('cursor', 'pointer').attr("stroke-width", 50);

            var y = d3.event.pageY;
            var x = d3.event.pageX;
            
            if (x > dimens.chartWidth - 300) {
                x -= 300 - (dimens.chartWidth - x);
            }

            if (y > dimens.chartHeight - 300) {
                y -= 300 - (dimens.chartHeight - y);
            }

            tooltip.style('top', (y + 20) + 'px')
                .style('left', (x + 20) + 'px');
		}
		
        function sideBarHandler(d) {
            var content = sideBarContent(d)
            if (selectedNodeId != "") {
				d3.select(selectedNodeId).attr("stroke-width", dimens.nodeStrokeWidth)
	            d3.select(selectedNodeId).attr("fill", selectedOriginalBackground)            	
            }

	        selectedNodeId = ("#N" + d.uniqueIdentifier)
	        selectedOriginalBackground = d3.select(selectedNodeId).attr("fill")

            d3.select('#detailsSideBar').html(content)
			d3.select(selectedNodeId).attr("stroke-width", dimens.selectedNodeStrokeWidth)
            d3.select(selectedNodeId).attr("fill", colors.selectedNodeBackground)
        }

        function tooltipOutHandler() {
            tooltip.transition()
                .duration(200)
                .style('opacity', '0').style('display', 'none');
            d3.select(this).attr("stroke-width", 5);
            d3.select('div.customTooltip-wrapper').select('div.ui.card').remove()
        }

        nodeGroup.on('click', sideBarHandler);
        //nodeGroup.on('mouseover', tooltipHoverHandler);
        //nodeGroup.on('mouseout', tooltipOutHandler);
        //nodeGroup.on('contextmenu', d3.contextMenu(menu));

        function equalToEventTarget() {
            return this == d3.event.target;
        }

        d3.select("body").on("click", function () {
            var outside = tooltip.filter(equalToEventTarget).empty();
            if (outside) {
                tooltip.style('opacity', '0').style('display', 'none');
            }
		});
	}

    function click(d) {
        d3.select(this).select("text").text(function (dv) {

            if (dv.collapseText == attrs.EXPAND_SYMBOL) {
                dv.collapseText = attrs.COLLAPSE_SYMBOL
            } else {
                if (dv.children) {
                    dv.collapseText = attrs.EXPAND_SYMBOL
                }
            }
            return dv.collapseText;
        })

        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }

    function redraw() {
        svg.attr("transform",
            "translate(" + d3.event.translate + ")" +
            " scale(" + d3.event.scale + ")");
    }

    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.2,
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0,
                tspan = text.text(null)
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y)
					.attr("dy", dy + "em");
					
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em")
                        .text(word);
                }
            }
        });
    }

    function addPropertyRecursive(propertyName, propertyValueFunction, element) {
        if (!element[propertyName]) {
			element[propertyName] = propertyValueFunction(element);
        }
        if (element.children) {
            element.children.forEach(function (v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
        if (element._children) {
            element._children.forEach(function (v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
    }

    // Return the path of the entity type icons
    function CheckOrgTypeReturnImage(v) {
        return (OrgTypeImagePath[OrgTypeLevel[v.ENTITY_ORG_TYPE] - 1])
    }

    function reflectResults(results) {
        var htmlStringArray = results.map(function (result) {
            var strVar = ``;
            strVar += `         <div class="list-item" style="cursor: pointer;" onclick='params.funcs.locate(${result.uniqueIdentifier})'>`;
            strVar += `          <a>`;
            strVar += `            <div class="image-wrapper">`;
            strVar += `              <img class="image" src="${CheckOrgTypeReturnImage(result)}"/>`;
            strVar += `            </div>`;
            strVar += `            <div class="description">`;
            strVar += `              <p class="name">${toTitleCase(result.ENTITY_NAME)}</p>`;
            strVar += `               <p class="entity-type">${result.ENTITY_ORG_TYPE}</p>`;

            if (result.ENTITY_ADDR1 != null) {
                strVar += `               <p class="area">${toTitleCase(result.ENTITY_ADDR1)},\n${toTitleCase(result.ENTITY_CITY)}</p>`;
            }
            strVar += `            </div>`;
            strVar += `            <div class="buttons">`;
            strVar += `            </div>`;
            strVar += `          </a>`;
            strVar += `        </div>`;

            return strVar;
        });

        var htmlString = htmlStringArray.join('');
        params.funcs.clearResult();

        var parentElement = get('.result-list');
        var old = parentElement.innerHTML;
        var newElement = htmlString + old;
        parentElement.innerHTML = newElement;
        set('.user-search-box .result-header', "RESULT - " + htmlStringArray.length);

    }

    function clearResult() {
        set('.result-list', '<div class="buffer" ></div>');
        set('.user-search-box .result-header', "RESULT");
    }

    function listen() {
        var input = get('.user-search-box .search-input');

        input.addEventListener('input', function () {

            var value = input.value ? input.value.trim() : '';
            if (value.length < 3) {
                params.funcs.clearResult();
            } else {
                
                var searchResult = params.funcs.findInTree(params.data, value);
                params.funcs.reflectResults(searchResult);
            }

        });
	}
	
	function fitToScreen(paddingPercent = 0.95, transitionDuration=500) {
		var root = d3.select('#drawArea');
		var bounds = root.node().getBBox();
		var parent = root.node().parentElement;
		var fullWidth = parent.clientWidth,
			fullHeight = parent.clientHeight;
		var width = bounds.width,
			height = bounds.height;
		var midX = bounds.x + width / 2,
			midY = bounds.y + height / 2;
		if (width == 0 || height == 0) return;
		var scale = (paddingPercent || 0.75) / Math.max(width / fullWidth, height / fullHeight);
		var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
	
		console.trace("zoomFit", translate, scale);
		root
			.transition()
			.duration(transitionDuration || 0)
			.call(zoomBehaviours.translate(translate).scale(scale).event);
	}

    function searchUsers() {
        d3.selectAll('.user-search-box')
            .transition()
            .duration(250)
            .style('width', '350px')
    }

    function closeSearchBox() {
        d3.selectAll('.user-search-box')
            .transition()
            .duration(250)
            .style('width', '0px')
            .each("end", function () {
                params.funcs.clearResult();
                clear('.search-input');
            });
    }

    function findInTree(rootElement, searchText) {
        var result = [];
        var regexSearchWord = new RegExp(searchText, "i");

        recursivelyFindIn(rootElement, searchText);

        return result;

        function recursivelyFindIn(user) {
            if (user.ENTITY_NAME.match(regexSearchWord)) {
                result.push(user)
            }

            var childUsers = user.children ? user.children : user._children;
            if (childUsers) {
                childUsers.forEach(function (childUser) {
                    recursivelyFindIn(childUser, searchText)
                })
            }
        };
    }

    function expandAll() {
        expand(attrs.root);
		update(attrs.root);
    }

    function expand(d) {
        if (d.children) {
            d.children.forEach(expand);
        }

        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }

        if (d.children) {
            setToggleSymbol(d, attrs.COLLAPSE_SYMBOL);
        }
	}
	
	function collapseAll() {
		if (attrs.root.children) {
			attrs.root.children.forEach(collapse);
		}
		
		update(attrs.root);
	}

    function collapse(d) {
        if (d._children) {
            d._children.forEach(collapse);
        }
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }

        if (d._children) {
            // if node has children and it's collapsed, then  display +
            setToggleSymbol(d, attrs.EXPAND_SYMBOL);
        }
    }

    function setCollapsibleSymbolProperty(d) {
        if (d._children) {
            d.collapseText = attrs.EXPAND_SYMBOL;
        } else if (d.children) {
            d.collapseText = attrs.COLLAPSE_SYMBOL;
        }
    }

    function setToggleSymbol(d, symbol) {
        d.collapseText = symbol;
        d3.select("*[data-id='" + d.uniqueIdentifier + "']").select('text').text(symbol);
    }

    function findmySelf(d) {
        if (d.isLoggedUser) {
            expandParents(d);
        } else if (d._children) {
            d._children.forEach(function (ch) {
                ch.parent = d;
                findmySelf(ch);
            })
        } else if (d.children) {
            d.children.forEach(function (ch) {
                ch.parent = d;
                findmySelf(ch);
            });
        };
    }

    function locateRecursive(d, id) {
        if (d.uniqueIdentifier == id) {
            expandParents(d);
		} 
		else if (d._children) {
            d._children.forEach(function (ch) {
                ch.parent = d;
                locateRecursive(ch, id);
            })
		} 
		else if (d.children) {
            d.children.forEach(function (ch) {
                ch.parent = d;
                locateRecursive(ch, id);
            });
        };
    }

    function expandParents(d) {
        while (d.parent) {
            debugger;
            d = d.parent;
            if (!d.children) {
                d.children = d._children;
                d._children = null;
                setToggleSymbol(d, attrs.COLLAPSE_SYMBOL);
            }
        }
    }

    function toggleFullScreen() {
        if ((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen)) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
            d3.select(params.selector + ' svg').attr('width', screen.width).attr('height', screen.height);
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
            d3.select(params.selector + ' svg').attr('width', params.chartWidth).attr('height', params.chartHeight);
        }
    }

    function JSONdownload() {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(circularRemovedNode);
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "data.json");
        dlAnchorElem.click();
    }

    function locate(id, recursive = true) {
        var copy_object = _.cloneDeep(attrs.root)
		expand(copy_object)
		var temp = recursiveFind(copy_object, id,[]);

        var  final_path = Array.from(new Set(temp))
        final_path.shift()

        if (attrs.root.children) {
            attrs.root.children.forEach(collapse);
        }
        
        expandSelectedNodes(attrs.root, final_path, id)

		update(attrs.root, {
            locate: id
		})
		
		if (selectedNodeId != "") {
			d3.select(selectedNodeId).attr("stroke", attrs.nodeStroke)
			d3.select(selectedNodeId).attr("stroke-width", colors.nodeStroke)
            d3.select(selectedNodeId).attr("fill", selectedOriginalBackground)            	
        }

		selectedNodeId = ("#N" + id)
		if (d3.select(selectedNodeId) == null) {
        	selectedOriginalBackground = d3.select(selectedNodeId).attr("fill")
		}
		else {
			selectedOriginalBackground = "#fff"
		}
        d3.select(selectedNodeId).attr("stroke-width", dimens.selectedNodeStrokeWidth)
        d3.select(selectedNodeId).attr("fill", colors.selectedNodeBackground)

        var elem = document.getElementById(selectedNodeId.replace('#', ''))
		if (elem != null) {
			var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(
			"click", // Type
			true, // Can bubble
			true, // Cancelable
			window, // View
			0, // Detail
			0, // ScreenX
			0, // ScreenY
			0, // ClientX
			0, // ClientY
			false, // Ctrl key
			false, // Alt key
			false, // Shift key
			false, // Meta key
			0, // Button
			null); // RelatedTarget

			elem.dispatchEvent(evt);			
		}
	}

    function set(selector, value) {
        var elements = getAll(selector);
        elements.forEach(function (element) {
            element.innerHTML = value;
            element.value = value;
        })
    }

    function clear(selector) {
        set(selector, '');
    }

    function get(selector) {
        return document.querySelector(selector);
    }

    function getAll(selector) {
        return document.querySelectorAll(selector);
    }

    function toTitleCase(str) {
        str = str.split(' ');
        for (var i = 0; i < str.length; i++) {
            for (var j=0; j<str[i].length; j++) {
                if (str[i].charCodeAt(j) > 96 && str[i].charCodeAt(j) < 123 
                    || (str[i].charCodeAt(j) > 64 && str[i].charCodeAt(j) < 91)) {

                    str[i] = str[i].substring(0, j) + str[i].charAt(j).toUpperCase() + str[i].slice(j+1).toLowerCase();
                    break;
                }
            }
        }
        return str.join(' ');
	};
	
    var overCircle = function (d) {
        selectedNode = d;
        updateTempConnector();
	};
	
    var outCircle = function (d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function () {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.x0,
                    y: selectedNode.y0
                },
                target: {
                    x: draggingNode.x0,
                    y: draggingNode.y0
                }
            }];
        }
        var link = svg.selectAll(".templink").data(data);
        
        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", drawLink(d.source,d.target));

        link.exit().remove();
	};

    function recursiveFind(node, value,path){    
        if (node.uniqueIdentifier == value){
            path.push(node)
            return path
		}
		
        else if(node.kids){
          for (let index = 0; index < node.kids.length; index++) {

              path.push(node)
              var fo = recursiveFind(node.kids[index],value,path)
			 
			  if(fo)
              {
                return fo 
              }
              else{ path.pop() }
          }
        
          if (node.children && node.children[node.children.length-1].uniqueIdentifier != node.kids[node.kids.length - 1].uniqueIdentifier  )
          {
            var currPageNo  = node.children[0].pageNo
            node.children = node.kids.filter( kid => kid.pageNo == currPageNo+1)

            path.push(node)
            var fo = recursiveFind(node,value,path)
            if(fo)
                {
                  return fo;
                }
                else { path.pop(); }
          
          }
          else{ return false; }
        }
        else{
            return false;
        }
	}

	// Collapse the tree and expand the nodes in the path
    function expandSelectedNodes(node,path){
		collapseAll();
		update(attrs.root);
        while(path.length > 0)
        {
            node.children = node.kids.filter( kid => kid.pageNo == path[0].pageNo)
			node = node.children.filter(next_node => next_node.uniqueIdentifier == path[0].uniqueIdentifier)[0]
			expand(node)
			path.shift()
        }
	}
}