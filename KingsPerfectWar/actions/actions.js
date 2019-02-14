let actions = {
    validActions: [0, 0, 0, 0],
    tick: function() {
        //get a list of valid actions, moving to next if cost fails
        for(let i = 0; i < actionsList.nextNames.length; i++) {
            let name = actionsList.nextNames[i];
            let list = actionsList.current[name];
            let action = list[this.validActions[i]];
            if(this.validActions[i] === (list.length-1) && action && action.varName === "sleep" && action.loopsLeft === 0) { //group sleeps together
                action.loops++;
                action.loopsLeft++;
                action.manaUsed = 0;
                if(actionsList.next[name][this.validActions[i]].varName === "sleep") {
                    actionsList.next[name][this.validActions[i]].loops = action.loops;
                }
            }
            while(action && (action.loopsLeft === 0 || (action.manaUsed === 0 && !action.canBuy()))) { //action exists but is invalid, slide
                this.validActions[i]++;
                if(!action.canBuy() && action.loopsLeft !== 0) { //failed to buy
                    action.failed++;
                    action.failedReason = "Not enough resources.";
                    action.loops -= action.loopsLeft;
                    action.loopsLeft = 0;
                    actions.refresh(i);
                }
                action = list[this.validActions[i]];
            }
            if(!action) { //Never found a valid action, create sleep
                addSleepAction(i);
                action = list[this.validActions[i]];
            }
        }

        //add tick to each action. if it finishes, get the rewards
        let shouldPause = false;
        for(let i = 0; i < actionsList.nextNames.length; i++) {
            let name = actionsList.nextNames[i];
            let action = actionsList.current[name][this.validActions[i]];
            if(!action) {
                console.log("????");
                continue;
            }
            if(action.manaUsed === 0 && action.buy) {
                action.spend(); //spend as soon as action starts
                if(action.start) {
                    action.start();
                }
            }
            if(i === 1 && ["sleep", "restart"].indexOf(action.varName) === -1) {
                action.manaUsed += king.getBonusByAura("build");
            } else {
                action.manaUsed++;
            }
            if(action.manaUsed / 10 >= action.costseconds) {
                action.loopsLeft--;
                if(action.loopsLeft > 0) {
                    action.manaUsed = 0;
                } else { //action done
                    action.manaUsed = action.costseconds * 10;
                    let nextAction = actionsList.current[name][this.validActions[i]+1];
                    if(nextAction && nextAction.varName === "pause" && nextAction.loopsLeft > 0) {
                        nextAction.loopsLeft = 0;
                        this.validActions[i]++;
                        pauseGame();
                    }
                }
                if(action.buy) {
                    action.buy();
                    adjustCosts(i);
                }
                if(["sleep", "restart"].indexOf(action.varName) === -1 && action.loopsLeft === 0 && !actionsList.current[name][this.validActions[i]+1]) { //no next action after non-sleep
                    shouldPause = true;
                }
            }
        }
        if(shouldPause && document.getElementById("pauseListEmpty").checked) {
            pauseGame();
        }
    },
    restart: function() {
        this.validActions = [0, 0, 0, 0];
        actionsList.current = {
            king:[],
            castle:[],
            units:[]
        };
        //clear all of the last action if it's sleep
        for(let i = 0; i < actionsList.nextNames.length; i++) {
            let name = actionsList.nextNames[i];
            let nextList = actionsList.next[name];
            if(nextList.length === 0) {
                continue;
            }
            let lastAction = nextList[nextList.length-1];
            if(lastAction.varName === "sleep") {
                nextList.splice(nextList.length-1, 1);
            }
        }
        for(let i = 0; i < actionsList.nextNames.length; i++) {
            actions.refresh(i);
        }
    },
    refresh: function(num) {
        //takes everything new on actionsList.next and puts it in actionsList.current
        let name = actionsList.nextNames[num];
        let nextList = actionsList.next[name];
        let currentList = actionsList.current[name];
        for(let j = 0; j < nextList.length; j++) {
            let curAction = actionsList.current[name][j];
            if(this.validActions[num] > j || //only modify untouched ones
                (this.validActions[num] === j && curAction && (curAction.manaUsed !== 0 || curAction.loopsLeft !== curAction.loops))) { //and ones not currently updating
                continue;
            }
            let action = copyArray(nextList[j]);
            translateNextToCurrent(action, name);
            actionsList.current[name][j] = action;
        }
        if(this.validActions[num] !== -1 && this.validActions[num] < nextList.length && currentList.length !== nextList.length) { //remove extra actions from current list
            currentList.splice(nextList.length, currentList.length - nextList.length);
        }

        adjustCosts(num);
    }
};

function adjustCosts(num) {
    let name = actionsList.nextNames[num];
    let currentList = actionsList.current[name];
    let numOnList = {};
    for(let i = 0; i < currentList.length; i++) {
        let action = currentList[i];
        let numPrior = (numOnList[action.varName] ? numOnList[action.varName] : 0);
        if(actions.validActions[num] === i && action.loopsLeft > 0) {
            numPrior += action.loops - action.loopsLeft; //also count completed loops in current action
        }
        if(action.createdWith) {
            setCosts(action, numPrior, numOnList[action.createdWith] ? numOnList[action.createdWith] : 0);
        } else {
            setCosts(action, numPrior);
        }
        numOnList[action.varName] = numPrior + action.loops;
    }
}

function setCosts(action, numPrior, numCreatedWith) {
    action.costseconds = 0;
    action.costgold = 0;
    action.costwood = 0;
    action.costmana = 0;
    if(numCreatedWith === undefined) {
        numCreatedWith = 1;
    }
    for(let i = 0; i < action.cost.length; i++) {
        let cost = action.cost[i];
        let amount = 0;
        if (cost.type === "static") {
            amount += cost.starting;
        } else if (cost.type === "linear") {
            amount += cost.starting + cost.growth * numPrior;
        }
        action["cost"+cost.resource] = numCreatedWith * amount;
    }
}

function translateNextToCurrent(action, name) {
    action.loopsLeft = action.loops;
    action.manaUsed = 0;
    action.failed = 0;
    action.failReason = "";

    let actionDatum = getActionByVarName(action.varName, name);
    action.name = actionDatum.name;
    if(actionDatum.moveAction) {
        action.name = warMap.actions.createNameString(action);
    }
    if(actionDatum.createdWith) {
        action.createdWith = actionDatum.createdWith;
    }
    if(actionDatum.start) {
        action.start = actionDatum.start
    }
    if(actionDatum.tribute) {
        action.tribute = actionDatum.tribute;
    }
    action.cost = actionDatum.cost;
    action.buy = actionDatum.buy;
    action.visible = actionDatum.visible;
    action.unlocked = actionDatum.unlocked;
    action.canBuy = actionDatum.canBuy;
    action.spend = function () {
        gold -= action.costgold;
        wood -= action.costwood;
        mana -= action.costmana;
    };
}

function getActionByVarName(varName, list) {
    if(["sleep", "pause", "restart"].indexOf(varName) !== -1) {
        return getOtherActionByVarName(varName);
    }

    if(list === "castle") {
        return getCastleActionByVarName(varName);
    } else if(list === "units") {
        return warMap.actions.getWarMapActionByVarName(varName);
    } else if(list === "king") {
        return getKingActionByVarName(varName);
    }
    return null;
}

function selectAction(varName, num) {
    //prev
    let infoBoxDiv = document.getElementById(curInfoBox+"InfoBox");
    infoBoxDiv.style.display = "none";
    let container = document.getElementById(curInfoBox+"Container");

    if(container) {
        let color = king.kingIsHome() ? "rgba(255, 255, 0, 1)" : "rgba(255, 255, 0, .4)";
        if(curInfoBox === "market" && king.curData.aura === "gold") {
            document.getElementById("marketContainer").style.border = "2px solid " + color;
        } else if(curInfoBox === "commune" && king.curData.aura === "wood") {
            document.getElementById("communeContainer").style.border = "2px solid " + color;
        } else if(curInfoBox === "direct" && king.curData.aura === "build") {
            document.getElementById("directContainer").style.border = "2px solid " + color;
        } else {
            container.style.border = "2px solid rgba(0, 0, 0, 0)";
        }
    }

    if(varName === curInfoBox) {
        varName = "extras";
        addButtons.style.display = "none";
        document.getElementById("deselectButton").style.display = "none";
    } else {
        addButtons.style.display = "block";
        document.getElementById("deselectButton").style.display = "block";
    }

    //next
    infoBoxDiv = document.getElementById(varName+"InfoBox");
    infoBoxDiv.style.display = "block";
    container = document.getElementById(varName+"Container");
    if(container) {
        let color = king.kingIsHome() ? "rgba(200, 200, 0, 1)" : "rgba(200, 200, 0, .4)";
        if(varName === "market" && king.curData.aura === "gold") {
            document.getElementById("marketContainer").style.border = "2px solid " + color;
        } else if(varName === "commune" && king.curData.aura === "wood") {
            document.getElementById("communeContainer").style.border = "2px solid " + color;
        } else if(varName === "direct" && king.curData.aura === "build") {
            document.getElementById("directContainer").style.border = "2px solid " + color;
        } else {
            container.style.border = "2px solid rgba(0, 0, 0, 1)";
        }
    }

    curInfoBox = varName;
    curListNum = num;
}

function deselect() {
    selectAction(curInfoBox, curListNum);
    document.getElementById("deselectButton").style.display = "none";
}

function addAction() {
    if(["sleep", "pause", "restart"].indexOf(curInfoBox) !== -1) {
        curListNum = curList;
    }
    addActionToList(curInfoBox, curListNum, true);
}

function addActionToList(varName, num, switchLists) {
    if(switchLists && curList !== num) {
        switchListTab(num);
    }
    if(num === 2 && varName !== "sleep") {
        let validAction = false;
        for (let property in unitsSelectedForMove) {
            if (unitsSelectedForMove.hasOwnProperty(property)) {
                validAction = validAction || unitsSelectedForMove[property];
            }
        }
        if(!validAction) {
            return; //Do nothing if no units are selected for the move action
        }
    }
    let listName = actionsList.nextNames[num];
    let action = getActionByVarName(varName, listName);
    if(action.moveAction) {
        action.unitsToMove = copyArray(unitsSelectedForMove); //for icons
    }
    if(action && action.visible() && action.unlocked() && (!action.allowed || getNumOnList(action.varName, listName) < action.allowed())) {
        let addAmount = window.addAmount;
        if(action.allowed) {
            let numLeft = action.allowed() - getNumOnList(action.varName, listName);
            if(numLeft < addAmount) {
                addAmount = numLeft;
            }
        }

        addActionToNext(action, listName, addAmount);
    }
    actions.refresh(num);
}

function addActionToNext(action, listName, addAmount, index) {
    let toAdd = {};
    toAdd.loops = addAmount;
    toAdd.varName = action.varName;
    if(action.unitsToMove) {
        toAdd.unitsToMove = action.unitsToMove;
    }

    if(index !== undefined) {
        actionsList.next[listName].splice(index, 0, toAdd) //insert at index
    } else {
        actionsList.next[listName].push(toAdd);
    }
}

function getNumOnList(varName, listName) {
    let theList = actionsList.next[listName];
    let count = 0;
    for(let i = 0; i < theList.length; i++) {
        if(theList[i].varName === varName) {
            count += theList[i].loops;
        }
    }
    return count;
}