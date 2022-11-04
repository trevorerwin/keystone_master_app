/**
 * Variables
 */
const submitBtn = document.querySelector('.submit-btn');
const fortifiedDungeonList = document.querySelector('.fortified-runs');
const tyrannicalDungeonList = document.querySelector('.tyrannical-runs');
const allDungeonList = document.querySelector('.keystone-runs');

/**
 * Event Listeners
 */
submitBtn.addEventListener('click', () => {
  const regionList = document.querySelector('.regions');
  const realm = document.querySelector('.realm-text');
  const charName = document.querySelector('.char-text');
  if (realm.value == '' || charName.value == '') {
    displayErrorMessage('You must fill in all required fields before submitting');
  } else {
    // 8 = Shadowlands ID, will change for Dragonflight
    fetchStaticDungeonData(8).then((staticData) => {
      if (staticData.statusCode === 400) {
        displayErrorMessage(staticData.message);
      } else {
        fetchCharacterData(regionList.value, realm.value, charName.value).then((charData) => {
          if (charData.statusCode === 400) {
            displayErrorMessage(charData.message);
          } else {
            console.log(charData);
            displayIntro(charData);
            deleteDungeonData();
            processDungeonData(charData, staticData);
          }
        });
      }
    });
  }
});

allDungeonList.addEventListener('click', (e) => {
  redirectToRaiderio(e.path[0].id);
});

/**
 * fetchStaticDungeonData(): Fetches the Promise, resolves to the Response object, and converts it to JSON in order to read the data provided by Raider.io
 *
 * @param {Integer} id: the expansion ID
 *
 * @returns A JSON object containing static dungeon data for the current M+ season
 */
async function fetchStaticDungeonData(id) {
  const response = await fetch(`https://raider.io/api/v1/mythic-plus/static-data?expansion_id=${id}`);

  const json = await response.json();
  return json;
}

/**
 * fetchCharacterData(): Fetches the Promise, resolves to the Response object, and converts it to JSON in order to read the data provided by Raider.io
 *
 * @param {String} region: the selected region
 * @param {String} realm: realm string
 * @param {String} char: character name string
 *
 * @returns A JSON object containing information pertaining to inputted character
 */
async function fetchCharacterData(region, realm, char) {
  const response = await fetch(
    `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${char}&fields=mythic_plus_ranks,mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_alternate_runs`
  );

  const json = await response.json();
  return json;
}

/**
 * displayIntro(): Sets the UI to show the character thumbnail, character name, their mythic+ score, and a message stating whether the player has achieved KSM or not
 *
 * @param {Object} data: JSON object fetched from Raider.io
 */
function displayIntro(data) {
  const dataDisplay = document.querySelector('.data-display');
  if (isKeystoneMaster(data.mythic_plus_scores_by_season[0].scores.all)) {
    dataDisplay.innerHTML = `
    <div class="char-results">
      <img src="${data.thumbnail_url}"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: <span class="mythic-score-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">${data.mythic_plus_scores_by_season[0].scores.all}</span></h4>
    </div>
    <div class="char-mythic-text">
      <h2>You are a <span class="keystone-master-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">Keystone Master</span>!</h2>
    </div>`;
  } else {
    dataDisplay.innerHTML = `
    <div class="char-results">
      <img src="${data.thumbnail_url}"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: <span class="mythic-score-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">${data.mythic_plus_scores_by_season[0].scores.all}</span></h4>
    </div>
    <div class="char-mythic-text">
      <h2>You're not quite a Keystone Master just yet. See what keys you need done below</h2>
    </div>`;
  }
}

/**
 * Computing the Dungeon Rating
 *
 * - first 10 levels = {0,40,45,55,60,65,75,80,85,100}
 * - add +5 per key level after
 * - negate
 *
 *
 * threshold = 0.4
 * bonus = 5
 * Formula
 * - par time fraction (ptf) = clear(ms)/par(ms)
 * - offset = 1 - ptf
 * - if(ptf > 0.4) return bonus
 * - elif(ptf > 0) return (ptf * bonus / threshold)
 * - elif(ptf=0) return 0
 * - elif(ptf > -threshold) return (ptf * bonus / threshold - bonus)
 * - else return null
 *
 *
 */

/**
 * processDungeonData(): Obtains the JSON data to append the needed divs to keystone-best-runs and update the UI
 *
 * @param {Object} charData: JSON object fetched from API
 * @param {Object} staticData: JSON object fetched from API
 */
function processDungeonData(charData, staticData) {
  // create a keystone-dungeon div
  const keystoneDungeon = createDungeonDiv();

  // show the keystone info section
  const keystoneInfoSection = document.querySelector('.keystone-info');
  keystoneInfoSection.style.display = 'block';

  // append divs to fortified-runs and tyrannical-runs
  const fortifiedList = document.querySelector('.fortified-runs');
  const tyrannicalList = document.querySelector('.tyrannical-runs');
  appendDivCopies(staticData, keystoneDungeon, fortifiedList, 'F');
  appendDivCopies(staticData, keystoneDungeon, tyrannicalList, 'T');

  // sort the dungeons by affix
  const tyrannicalRuns = filterDungeonByAffix(charData.mythic_plus_best_runs.concat(charData.mythic_plus_alternate_runs), 'Tyrannical');
  const fortifiedRuns = filterDungeonByAffix(charData.mythic_plus_best_runs.concat(charData.mythic_plus_alternate_runs), 'Fortified');

  // get all keystone-dungeon elements
  const keystoneDungeonDivsFort = document.getElementsByClassName('keystone-dungeon-fortified');
  const keystoneDungeonDivsTyran = document.getElementsByClassName('keystone-dungeon-tyrannical');

  // insert the data into the UI
  insertDungeonData(keystoneDungeonDivsFort, fortifiedRuns);
  insertDungeonData(keystoneDungeonDivsTyran, tyrannicalRuns);
}

/**
 * sortDungeonByAffix(): filters the JSON data to only contain dungeons that include a specific affix
 *
 * @param {Object} dungeonList: JSON object fetched from API
 * @param {String} affix: the affix we want to filter by
 *
 * @return a JSON object containing only the dungeons with the filtered affix
 */
function filterDungeonByAffix(dungeonList, affix) {
  const result = dungeonList.filter((item) => {
    if (item.affixes[0].name === affix) {
      return true;
    } else {
      return false;
    }
  });

  return result;
}

/**
 * insertDungeonData(): Updates the UI to show the players best M+ runs, displaying the dungeon name, keystone level, upgrade level, affixes, time completed, and score
 *
 * @param {Object} dungeons: a list of keystone-dungeon divs
 * @param {Object} dungeonList: JSON object containing the characters mythic+ * data
 */
function insertDungeonData(dungeons, dungeonList) {
  for (let i = 0; i < dungeons.length; i++) {
    for (let j = 0; j < dungeonList.length; j++) {
      if (dungeonList[j].short_name === dungeons[i].id.substring(0, dungeons[i].id.lastIndexOf('-'))) {
        // dungeon name and upgrade level
        dungeons[i].children[0].innerHTML = `${keystoneUpgrade(dungeonList[j].num_keystone_upgrades)}${dungeonList[j].mythic_level} ${dungeonList[j].dungeon}`;

        // affixes
        dungeons[i].children[1].innerHTML = `${dungeonList[j].affixes[0].name}, ${dungeonList[j].affixes[1].name}, ${dungeonList[j].affixes[2].name}, ${dungeonList[j].affixes[3].name}`;

        // clear time
        // add indication in UI if keystone was over time
        if (dungeonList[j].clear_time_ms < dungeonList[j].par_time_ms) {
          dungeons[i].children[2].innerHTML = `Time: ${msToTime(dungeonList[j].clear_time_ms)}`;
        } else {
          dungeons[i].children[2].innerHTML = `Time: ${msToTime(dungeonList[j].clear_time_ms)} (over time)`;
        }

        // score
        dungeons[i].children[3].innerHTML = `Score: ${dungeonList[j].score}`;
      }
    }
    // check if div is still empty
    if (dungeons[i].children[0].innerHTML === '') {
      dungeons[i].children[0].innerHTML = 'Incomplete';
    }
  }
}

/**
 * setDungeonBackground(): Sets the background of a keystone-dungeon div with its' appropriate image
 *
 * @param {String} name: short-hand name of the specific dungeon
 *
 * @return A string of the background image css style with the correct dungeon image
 */
function setDungeonBackground(name) {
  switch (name) {
    case 'YARD':
    case 'WORK':
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url(img/mechagon.jpg)';
    case 'UPPR':
    case 'LOWR':
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/karazhan.jpg)';
    case 'GMBT':
    case 'STRT':
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/tazavesh.jpg)';
    case 'ID':
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/irondocks.jpg)';
    case 'GD':
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/grimraildepot.jpg)';
    default:
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/karazhan.jpg)';
  }
}

/**
 * addDungeonDiv(): Creates the keystone-dungeon div
 */
function createDungeonDiv() {
  // create the div
  const keystoneDungeon = document.createElement('div');
  keystoneDungeon.className = 'keystone-dungeon';
  keystoneDungeon.innerHTML =
    '<h3 class="keystone-dungeon-name"></h3>' + '<h3 class="keystone-dungeon-affixes"></h3>' + '<h3 class="keystone-dungeon-time"></h3>' + '<h3 class="keystone-dungeon-score"></h3>';
  return keystoneDungeon;
}

/**
 * deleteDungeonData(): Deletes the current dungeon data from the UI if any such data exists
 */
function deleteDungeonData() {
  const keystoneDungeonDivs = document.getElementsByClassName('keystone-dungeon');
  while (keystoneDungeonDivs.length > 0) {
    keystoneDungeonDivs[0].parentNode.removeChild(keystoneDungeonDivs[0]);
  }
}

/**
 * redirectToRaiderio(): Opens a webpage of the keystone run the user clicked on
 *
 * @param {Object} target: the event object (dungeon div user clicked on)
 */
function redirectToRaiderio(target) {
  const regionList = document.querySelector('.regions');
  const realm = document.querySelector('.realm-text');
  const charName = document.querySelector('.char-text');
  const dungeonName = target.substring(0, target.lastIndexOf('-'));
  const affix = target.charAt(target.length - 1);

  fetchCharacterData(regionList.value, realm.value, charName.value).then((data) => {
    const fullData = data.mythic_plus_best_runs.concat(data.mythic_plus_alternate_runs);

    if (affix === 'F') {
      const targetDiv = fullData.filter((item) => {
        return item.short_name === dungeonName && item.affixes[0].name === 'Fortified';
      });
      if (Array.isArray(targetDiv) && targetDiv.length) {
        window.open(`${targetDiv[0].url}`, '_blank');
      }
    } else {
      const targetDiv = fullData.filter((item) => {
        return item.short_name === dungeonName && item.affixes[0].name === 'Tyrannical';
      });
      if (Array.isArray(targetDiv) && targetDiv.length) {
        window.open(`${targetDiv[0].url}`, '_blank');
      }
    }
  });
}

/**
 * keystoneUpgrade(): Determines the upgrade level of a keystone with '+'symbols
 *
 * @param {Integer} num: keystone upgrade level
 *
 * @return The upgrade level as a string of '+' symbols
 */
function keystoneUpgrade(num) {
  const keyUpgrade = ['', '+', '++', '+++'];
  return keyUpgrade[num];
}

/**
 * appendNCopies(): Appends nodes to a document element - used for inserting the keystone-dungeon divs into the document
 *
 * @param {Object} data: our static dungeon data
 * @param {Object} original: the node we want to copy
 * @param {Object} appendTo: the node we want to append to
 * @param {String} affix: the fortified/tyrannical affix char(F or T)
 */
function appendDivCopies(data, original, appendTo, affix) {
  for (let i = 0; i < data.seasons[0].dungeons.length; i++) {
    // clone the node
    let clone = original.cloneNode(true);

    // check the affix and add respective class
    if (affix === 'F') {
      clone.className += ' keystone-dungeon-fortified';
    } else {
      clone.className += ' keystone-dungeon-tyrannical';
    }

    // set id and background
    clone.id = `${data.seasons[0].dungeons[i].short_name}-${affix}`;
    clone.style.backgroundImage = setDungeonBackground(data.seasons[0].dungeons[i].short_name);

    appendTo.appendChild(clone);

    // dungeons[i].style.backgroundImage = setDungeonBackground(dungeonList[i].short_name);
  }
}

/**
 * displayErrorMessage(): Displays an error modal in the window
 *
 * @param {String} msg: Error message to display
 */
function displayErrorMessage(msg) {
  const errorBox = document.querySelector('.error-box');
  errorBox.innerHTML = msg;
  errorBox.style.display = 'block';
  setTimeout(function () {
    errorBox.style.display = 'none';
  }, 3000);
}

/**
 * isKeystoneMaster(): Checks if the inputted character has KSM already
 *
 * @param {Integer} playerRating: the players M+ score
 *
 * @returns true if the playerRating is greater than or equal to 2000, else false
 */
function isKeystoneMaster(playerRating) {
  return playerRating >= 2000;
}

/**
 * msToTime(): Convert miliseconds to hh:mm:ss.sss UTC format
 *
 * @param {Integer} s: time in miliseconds
 *
 * @returns The time in the specified format above
 */
function msToTime(s) {
  // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad((s / 3.6e6) | 0) + ':' + pad(((s % 3.6e6) / 6e4) | 0) + ':' + pad(((s % 6e4) / 1000) | 0) + '.' + pad(s % 1000, 3);
}
