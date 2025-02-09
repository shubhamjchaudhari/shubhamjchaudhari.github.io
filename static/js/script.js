window.onresize = function(){ location.reload(); }

var params = {
	selector: "#svgChart",
	chartWidth: (window.innerWidth - 40) * 0.83,
	chartHeight: window.innerHeight - 50,
	funcs: {
		showMySelf: null,
		search: null,
		closeSearchBox: null,
		clearResult: null,
		findInTree: null,
		reflectResults: null,
		departmentClick: null,
		back: null,
		toggleFullScreen: null,
		locate: null,
		collapseAll: null
	},
	entityType: '',
	data: null,
	colorCategory: {
		'low': '#F5B7B1',
		'medium': '#F9E79F',
		'high': '#A8FFD8'
	},
	relationColors: {
		"Filled": "slategrey",
		"Owned": "blue",
		"Affiliated Purchasing": "magenta",
		"Managed": "red",
		"Leased": "orange",
		"OWNERSHIP": "purple",
		"DEPARTMENT": "forestgreen",
		"OUTLET": "black"
	}
}

var requiredDataSourceName = '';
var selectedEntityName = '';
var selectedEntityType = '';
var dataSource = null;
var viewColorBy = 0;

d3.select('#fitToScreenButton').style('top', "30px")
d3.select('#fitToScreenButton').style('left', (window.innerWidth - 80) + "px")

d3.select('#expandAllButton').style('top', "70px")
d3.select('#expandAllButton').style('left', (window.innerWidth - 80) + "px")

d3.select('#collapseAllButton').style('top', "110px")
d3.select('#collapseAllButton').style('left', (window.innerWidth - 80) + "px")

d3.select('#searchButton').style('top', "150px")
d3.select('#searchButton').style('left', (window.innerWidth - 80) + "px")

var detailsSideBarWidth = (window.innerWidth - params.chartWidth - 3) < 300 ? (window.innerWidth - params.chartWidth - 3) : 300;
params.chartWidth = window.innerWidth - detailsSideBarWidth - 3;
var navbarHeight = parseInt(d3.select('#navbar').style("height").slice(0, -2))

params.detailsSideBarWidth = detailsSideBarWidth;

d3.select('.details-side-bar').style('width', detailsSideBarWidth + "px")
d3.select('.details-side-bar').style('height', window.innerHeight + "px")
d3.select('.details-side-bar').style('top', (navbarHeight) + "px")
d3.select('.details-side-bar').style('position', "fixed")
d3.select('#svgChart').style('margin-left', detailsSideBarWidth + "px")
d3.select('#svgChart').style('top', "0px")

d3.select('.legend').style('top', (window.innerHeight - 47) + "px")
d3.select('.legend').style('left', (detailsSideBarWidth) + "px")

d3.select('#viewColorByLegend').style('top', (window.innerHeight - 47) + "px")
d3.select('#viewColorByLegend').style('left', (detailsSideBarWidth + 950) + "px")

var OrgTypes = ['All', 'HOSP','CLIN', 'PHAR', 'INDP', 'WHOL', 'UNSPEC', 'CLIN', 'RC', 'PAYR', 'INDP', 'PHAR', 'HMHLT','OUTLET']
var ViewColorByCategory = ['None', 'Patient Revenue', 'Net Income', 'Net Income Margin', 'Structure Segment', 'Patient Experience Segment', 'Quality Segment', 'Research Segment', 'Willingness to Partner Segment', 'Expression Segment']

$(document).ready(function () {
	tableau.extensions.initializeAsync().then(function () {
		tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
			parameters.forEach(function (p) {
				p.addEventListener(tableau.TableauEventType.ParameterChanged, onParameterChange);
				if (p.name === 'SelectedEntityName') {
					selectedEntityName = p.currentValue.formattedValue;
				}
				else if (p.name === 'RequiredDataSourceName') {
					requiredDataSourceName = p.currentValue.formattedValue;
				}
				else if (p.name === 'SelectedEntityType') {
					selectedEntityType = p.currentValue.formattedValue;
				}
				else if (p.name === 'ViewColorsBy') {
					viewColorBy = p.currentValue.formattedValue;
				}
			});
		});

		let dataSourceFetchPromises = [];

		// Maps dataSource id to dataSource so we can keep track of unique dataSources.
		let dashboardDataSources = {};

		// To get dataSource info, first get the dashboard.
		const dashboard = tableau.extensions.dashboardContent.dashboard;

		// Then loop through each worksheet and get its dataSources, save promise for later.
		dashboard.worksheets.forEach(function (worksheet) {
			dataSourceFetchPromises.push(worksheet.getDataSourcesAsync());
		});

		Promise.all(dataSourceFetchPromises).then(function (fetchResults) {
			fetchResults.forEach(function (dataSourcesForWorksheet) {
				dataSourcesForWorksheet.forEach(function (dataSource) {
					//if (!dashboardDataSources[dataSource.id]) { // We've already seen it, skip it.
					dashboardDataSources[dataSource.id] = dataSource;
					//}
				});
			});

			buildDataSourcesTable(dashboardDataSources);
		});
	}, function (err) {
		// Something went wrong in initialization.
		console.log('Error while Initializing: ' + err.toString());
	});
});

function onParameterChange (parameterChangeEvent) {
	parameterChangeEvent.getParameterAsync().then(function (param) {
		if (param.name === 'SelectedEntityName') {
			selectedEntityName = param.currentValue.formattedValue;

			dataSource.getLogicalTablesAsync().then(logicalTables => {
				dataSource.getLogicalTableDataAsync(logicalTables[0].id).then(dataTable => {
					preprocessData(dataTable, selectedEntityName);
				});
			});
		}

		if (param.name === 'ViewColorsBy') {
			viewColorBy = param.currentValue.formattedValue;

			params.entityType = selectedEntityType;
			params.colorBy = ViewColorByCategory.indexOf(viewColorBy);

			document.getElementById('viewColorByLegend').innerHTML = '';
			document.getElementById('legend').innerHTML = '';
			d3.selectAll("svg").remove();
			drawOrganizationChart(params);
		}

		if (param.name === 'SelectedEntityType') {
			selectedEntityType = param.currentValue.formattedValue;

			params.entityType = selectedEntityType;
			params.colorBy = ViewColorByCategory.indexOf(viewColorBy);

			document.getElementById('viewColorByLegend').innerHTML = '';
			document.getElementById('legend').innerHTML = '';
			d3.selectAll("svg").remove();
			drawOrganizationChart(params);
		}
	});
}

// Refreshes the given dataSource.
function refreshDataSource (dataSource) {
	dataSource.refreshAsync().then(function () {
		console.log(dataSource.name + ': Refreshed Successfully');
	});
}

function buildDataSourcesTable (dataSources) {
	// Add an entry to the dataSources table for each dataSource.
	for (let dataSourceId in dataSources) {
		if (dataSources[dataSourceId].name === requiredDataSourceName) {
			dataSource = dataSources[dataSourceId];
		
			dataSource.getLogicalTablesAsync().then(logicalTables => {
				// Get the first logical table's id
				// In Tableau <= 2020.1, the first table is the only table returned.
				dataSource.getLogicalTableDataAsync(logicalTables[0].id).then(dataTable => {
					preprocessData(dataTable, selectedEntityName);
				});
			});
		}
	}
}

function preprocessData(dataTable, entityL1) {
	var requiredData = []

	let field = dataTable.columns.find(column => column.fieldName === "Lvl1 Name");
	for(var i=0; i<dataTable.data.length; i++) {
		if (dataTable.data[i][field.index]['_formattedValue'] === entityL1) {
			requiredData.push(dataTable.data[i]); 
		}
	}

	var jsonFormat = []

	generateJsonFormat(requiredData, jsonFormat, 1)

	params.data = jsonFormat[0];
	params.entityType = selectedEntityType;
	params.colorBy = ViewColorByCategory.indexOf(viewColorBy);

	document.getElementById('viewColorByLegend').innerHTML = '';
	document.getElementById('legend').innerHTML = '';
	d3.selectAll("svg").remove();
	drawOrganizationChart(params);

	function generateJsonFormat(data, json, depth) {
		var currentLevel = dataTable.columns.find(column => column.fieldName === `Lvl${depth} Id`);  
		if (currentLevel == undefined) { return; }

		if(String(data[0][currentLevel.index]['_formattedValue']) === 'Null') { return; }
		
		// Create the node in json
		var node = {};

		node.ENTITY_ID = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Id`).index]['_formattedValue']

		// Check if No of Osubs Columns exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Osubs`) != undefined)
			node.NO_OF_OSUBS = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Osubs`).index]['_formattedValue']

		// Check if No of Hosps Columns exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Hosps`) != undefined)
			node.NO_OF_HOSPS = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Hosps`).index]['_formattedValue']

		// Check if No of Socs Columns exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Socs`) != undefined)
			node.NO_OF_SOCS = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Socs`).index]['_formattedValue']

		// Check if No of Outlets Columns exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Outlets`) != undefined)
			node.NO_OF_OUTLETS = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} No Of Outlets`).index]['_formattedValue']

		// Check if Name Columns exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Name`) != undefined)
			node.ENTITY_NAME = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Name`).index]['_formattedValue']

		// Check if Entity Type Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Entity Type`) != undefined)
			node.ENTITY_TYPE = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Entity Type`).index]['_formattedValue']

		// Check if Org Type Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Org Type`) != undefined)
			node.ENTITY_ORG_TYPE = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Org Type`).index]['_formattedValue']

		// Check if Org Subtype Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Org Subtype`) != undefined)
			node.ENTITY_ORG_SUBTYPE = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Org Subtype`).index]['_formattedValue']

		// Check if Address Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Addr 1`) != undefined)
			node.ENTITY_ADDR1 = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Addr 1`).index]['_formattedValue']

		// Check if City Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} City`) != undefined)
			node.ENTITY_CITY = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} City`).index]['_formattedValue']

		// Check if State Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} St`) != undefined)
			node.ENTITY_STATE = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} St`).index]['_formattedValue']

		// Check if Zip Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Zip`) != undefined)
			node.ENTITY_ZIP = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Zip`).index]['_formattedValue']


		// Check if 340B Flag Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} 340B Flag`) != undefined)
			node.ENTITY_340B_FLAG = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} 340B Flag`).index]['_formattedValue']

		// Check if Srep Access Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Srep Access`) != undefined)
			node.ENTITY_SREP_ACCESS = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Srep Access`).index]['_formattedValue']

		// Check if Net Patient Revenue exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Patient Revenue`) != undefined)
			node.NET_PATIENT_REVENUE = parseFloat(data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Patient Revenue`).index]['_formattedValue']).toFixed(2)


		// Check if Net Income Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Income`) != undefined)
			node.NET_INCOME = parseFloat(data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Income`).index]['_formattedValue']).toFixed(2)


		// Check if Net Income Margin Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Income Margin`) != undefined)
			node.NET_INCOME_MARGIN = parseFloat(data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Net Income Margin`).index]['_formattedValue']).toFixed(2)

		// Check if Structure Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Structure Segment`) != undefined)
			node.STRUCTURE_SEGMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Structure Segment`).index]['_formattedValue']


		// Check if Patient Experience Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Patient Experience Segment`) != undefined)
			node.PATIENT_EXPERIENCE_SEGEMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Patient Experience Segment`).index]['_formattedValue']


		// Check if Quality Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Quality Segment`) != undefined)
			node.QUALITY_SEGMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Quality Segment`).index]['_formattedValue']

		// Check if Research Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Research Segment`) != undefined)
			node.RESEARCH_SEGEMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Research Segment`).index]['_formattedValue']


		// Check if Willingness To Patner Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} 340B Flag`) != undefined)
			node.WILLINGNESS_TO_PATNER_SEGMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Willingness To Patner Segment`).index]['_formattedValue']


		// Check if Expression Segment Column exists
		if (dataTable.columns.find(column => column.fieldName === `Lvl${depth} Expression Segment`) != undefined)
			node.EXPRESSION_SEGMENT = data[0][dataTable.columns.find(column => column.fieldName === `Lvl${depth} Expression Segment`).index]['_formattedValue']

		var field1 = dataTable.columns.find(column => column.fieldName === `Lvl${depth - 1} ${depth} Rel Type`);
		if (field1 != undefined && field1 != null)
			node.REL_TYPE = data[0][field1.index]['_formattedValue']

		var field2 = dataTable.columns.find(column => column.fieldName === `Lvl${depth - 1} ${depth} Rel Subtype`);      
		if (field2 != undefined && field2 != null)
			node.REL_SUBTYPE = data[0][field2.index]['_formattedValue']

		var field3 = dataTable.columns.find(column => column.fieldName === `Lvl${depth + 1} Id`);
		if (field3 != undefined) {
			if (String(data[0][field3.index]['_formattedValue']) != 'Null') {
				node.children = []
			}
		}

		// Get its children
		if (node.children) {
			var idList = [];
			var field = `Lvl${depth + 1} Id`;
			let fieldIndex = dataTable.columns.find(column => column.fieldName === field).index;
			
			for(var index=0; index < data.length; index++) {
				idList.push(data[index][fieldIndex]['_formattedValue'])
			}

			let uniqueChars = [...new Set(idList)]

			// Iterate over all children
			for (var i=0; i<uniqueChars.length; i++) {
				var requiredData = []
				// Iterate over data to get a single entity
				for(var j=0; j<data.length; j++) {
					if (data[j][fieldIndex]['_formattedValue'] === uniqueChars[i]) {
						requiredData.push(data[j]); 
					}
				}

				generateJsonFormat(requiredData, node.children, depth + 1)
			}
		}

		json.push(node)
	}
}