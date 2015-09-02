function clickBuyButton(pos, type) {
	//only pos == 1 and 4
	typeNum = convertTypeToNum(type, "right")
	if(pos === 1 && unitPointValues[typeNum][3] > 0) {
		unitPointValues[typeNum][0]++
		unitPointValues[typeNum][3]--
	}
	if(pos === 4 && unitPointValues[typeNum][0] > 0) {
		unitPointValues[typeNum][3]++
		unitPointValues[typeNum][0]--
	}
	handleBuyAmounts(typeNum, 0)
	handleBuyAmounts(typeNum, 3)
	updateStatusUpgrades("", type)
	updateGoldVisual()
}

function handleBuyAmounts(y, x) {
	unitValues[y][x] = unitValuesInitial[y][x]*unitPointValues[y][x]*.1+unitValuesInitial[y][x]*Math.pow(1.04, unitPointValues[y][x]);
}

function clickBuySpawnRate(type) {
	typeNum = convertTypeToNum(type, "right") 
	if(costSpawnRate[typeNum] <= gold) {
		gold -= costSpawnRate[typeNum]
		costSpawnRate[typeNum] *= (1.6 + typeNum/10)
		initialSpawnRate[typeNum/2] *= .95;
		spawnRate[typeNum/2] *= .95;
		if(initialSpawnRate[typeNum/2] <= .5) {
			initialSpawnRate[typeNum/2]*=2;
			spawnRate[typeNum/2] *= 2;
			initialSpawnAmounts[typeNum/2]*=2;
			spawnAmounts[typeNum/2] *= 2;
		}
	}
	updateStatusUpgrades("", type)
	updateGoldVisual()
	updateSpawnRate()
}

function buyUpgradePoint(type) {
	typeNum = convertTypeToNum(type, "right")
	if(unitCosts[typeNum] <= gold) {
		gold -= unitCosts[typeNum]
		updateGoldVisual()
		unitCosts[typeNum] = Math.floor(1.2 * unitCosts[typeNum]);
		upgradePointsInitial[typeNum]++
		unitPointValues[typeNum][3]++;
		handleBuyAmounts(typeNum, 3)
		updateStatusUpgrades("", type)
		$("#slider").slider('option', 'max', upgradePointsInitial[typeNum]);
		$("#slider").slider('value', unitPointValues[typeNum][3]);
	}
	updateGoldVisual()
}

function removeHover() {
	prevDiv = document.getElementById("unit"+curClickedUnit);
	if(prevDiv) {
		prevDiv.style.border = "0px solid black";
		prevDiv.style.marginTop = "0px";
		prevDiv.style.marginLeft = "0px";
		prevDiv.style.padding = "0px";
	}
	document.getElementById("victoryConditionBox").style.display="inline-block";
	document.getElementById("unitDisplayBox").style.display="none";
	
	curClickedUnit = "-1";
}

function hoverAUnit(id) {
	prevDiv = document.getElementById("unit"+curClickedUnit);
	if(prevDiv) {
		prevDiv.style.border = "0px solid black";
		prevDiv.style.marginTop = "0px";
		prevDiv.style.marginLeft = "0px";
		prevDiv.style.padding = "0px";
	}
	curClickedUnit = id;
	if(id=="-1") {
		document.getElementById("victoryConditionBox").style.display="inline-block";
		document.getElementById("unitDisplayBox").style.display="none";
		return;
	}
	div = document.getElementById("unit"+id);
	div.style.border = "1px solid black";
	div.style.marginTop = "-1px";
	div.style.marginLeft = "-3px";
	div.style.padding = "0px 2px";
	
	updateHover(id)
	
	document.getElementById("victoryConditionBox").style.display="none";
	document.getElementById("unitDisplayBox").style.display="inline-block";
}

function buyStartingPlaceAmounts(num) {
	if(territory > placeAmountCosts[num]) {
		placeAmountsStart[num]++
		placeAmounts[num]++
		territory-=placeAmountCosts[num]
	}
	updateTerritoryVisual()
	updatePlaceVisuals()
}
var myKeyQueue = [];

$(document).keydown(function(e) {
    code = (e.charCode != 0 ? e.charCode : e.keyCode)
    myKeyQueue.push(code);
	processKeyQueue();
});

/*$(document).keyup(function(e) {
    processKeyQueue();
});*/

function processKeyQueue() {
	key = myKeyQueue[0]
	myKeyQueue.splice(0, 1);
	if(key == 49) { //1
		clickedSpell(0)
	}
	if(key == 50) { //2
		clickedSpell(1)
	}
	if(myKeyQueue.length > 0)
		processKeyQueue()
}



function startANewstage() {
	for(y = 0; y < units.length; y++) {
		for(x = units[y].length-1; x>=0; x--) {
			removeUnit(units[y][x], false);
		}
	}
	//TODO:handle different lines amounts visually
	linesEnabled = maps[stage][8];
	handleLineAmounts(linesEnabled)
	units = [[],[],[],[],[],[]];
	soldierSpawnRate = 0;
	spearSpawnRate = 0;
	bonusFromFam = 1;
	spawnRate=[];
	spawnAmounts=[]
	for(j = 0; j < initialSpawnAmounts.length; j++) {
		spawnRate[j] = initialSpawnRate[j]
		spawnAmounts[j]=initialSpawnAmounts[j]
	}
	enemySpawnRate = .5;
	enemySpawnAmounts=[maps[stage][9][0], maps[stage][9][1], maps[stage][9][2]]
	enemySpawnRateIncrease=[maps[stage][10][0], maps[stage][10][1], maps[stage][10][2]]
	
	curBattles = [];
	storedLines = [];
	timer = 19;
	totalTicks = 0
	curClickedUnit = -1;
	document.getElementById("stage").innerHTML=stage;
	document.getElementById("territoryGain").innerHTML = mapTimers[stage]>0?maps[stage][1]/5:maps[stage][1]
	document.getElementById("goldGain").innerHTML = maps[stage][0]
	unitValues[1] = [2+stage*Math.pow(1.2, (stage))/5, 4, .06, Math.floor(Math.pow(stage+10, 4)/117), 0, 4.5]
	unitValues[3] = [14+stage*5+Math.pow(1.25, stage), 20, .04, 35+Math.floor(Math.pow(stage+5, 3)/4), 0, 10]
	//updateProgressVisual()
	placeCurTimers=[]
	placeAmounts=[]
	for(j = 0; j < placeMaxTimers.length; j++) {
		placeCurTimers[j]=placeMaxTimers[j]
		placeAmounts[j]=placeAmountsStart[j]
	}
	enemyFenceHealthInitial = maps[stage][2]
	enemyWallHealthInitial = maps[stage][3]
	wallHealth = wallHealthInitial
	enemyWallHealth = enemyWallHealthInitial
	fenceHealth = fenceHealthInitial
	enemyFenceHealth = enemyFenceHealthInitial;
	document.getElementById("enemyFence").style.display =  enemyFenceHealth>0?'inline-block':'none';;
	document.getElementById("enemyFenceHealth").style.display = enemyFenceHealth>0?'inline-block':'none';;
	document.getElementById("fence").style.display = fenceHealth>0?'inline-block':'none';
	document.getElementById("fenceHealth").style.display = fenceHealth>0?'inline-block':'none';
	
	updateSpawnRate()
	//addUnit("spear", 0, "right", 1);
}