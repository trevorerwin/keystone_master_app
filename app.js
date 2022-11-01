/**
 * Variables
 */
const submitBtn = document.querySelector('.submit-btn');
const fortifiedDungeonList = document.querySelector('.fortified-runs');
const tyrannicalDungeonList = document.querySelector('.tyrannical-runs');

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
            // console.log(charData);
            // console.log(staticData);
            displayIntro(charData);
            deleteDungeonData();
            processDungeonData(charData, staticData);
          }
        });
      }
    });
  }
});

// fullDungeonList.addEventListener('click', (e) => {
//   redirectToRaiderio(e.path[0].id);
// });

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
      <img src="${data.thumbnail_url}"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: ${data.mythic_plus_scores_by_season[0].scores.all}</h4>
      <h2>You are a <span class="keystone-master-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">Keystone Master</span>!</h2>`;
  } else {
    dataDisplay.innerHTML = `
      <img src="${data.thumbnail_url}"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: ${data.mythic_plus_scores_by_season[0].scores.all}</h4>
      <h2>Oof... You're not quite a Keystone Master just yet.</h2>`;
  }
}

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

  // get all keystone-dungeon elements
  const keystoneDungeonDivsFort = document.getElementsByClassName('keystone-dungeon-fortified');
  const keystoneDungeonDivsTyran = document.getElementsByClassName('keystone-dungeon-tyrannical');

  const bestRuns = charData.mythic_plus_best_runs;
  const alternateRuns = charData.mythic_plus_alternate_runs;

  testInsert(keystoneDungeonDivsFort, bestRuns);
  // testInsert(keystoneDungeonDivsFort, alternateRuns)
  // insertDungeonData(keystoneDungeonDivs, bestRuns);
}

function testInsert(dungeons, dungeonList) {
  for (let i = 0; i < dungeons.length; i++) {
    console.log(dungeonList);
    console.log(`The ID we are looking for is: ${dungeons[i].id}`);
    for (let j = 0; j < dungeonList.length; j++) {
      let text = dungeonList[j].affixes[0].name;
      let idString = `${dungeonList[j].short_name}-${text.charAt(0)}`;
      console.log('j loop');
      console.log(idString);
      console.log(dungeons[i].id);
      if (dungeons[i].id === idString) {
        console.log('MATCH!!');
        dungeonList.splice(j, 1);
        break;
      }
    }
  }
}

/**
 * insertDungeonData(): Updates the UI to show the players best M+ runs, displaying the dungeon name, keystone level, upgrade level, affixes, time completed, and score
 *
 * @param {Object} dungeons: a list of keystone-dungeon divs
 * @param {Object} dungeonList: JSON object containing the characters mythic+ * data
 */
function insertDungeonData(dungeons, dungeonList) {
  for (let i = 0; i < dungeonList.length; i++) {
    // set background image
    dungeons[i].style.backgroundImage = setDungeonBackground(dungeonList[i].short_name);

    // dungeon name and upgrade level
    dungeons[i].children[0].innerHTML = `${keystoneUpgrade(dungeonList[i].num_keystone_upgrades)}${dungeonList[i].mythic_level} ${dungeonList[i].dungeon}`;

    // affixes
    dungeons[i].children[1].innerHTML = `${dungeonList[i].affixes[0].name}, ${dungeonList[i].affixes[1].name}, ${dungeonList[i].affixes[2].name}, ${dungeonList[i].affixes[3].name}`;

    // clear time
    // add indication in UI if keystone was over time
    if (dungeonList[i].clear_time_ms < dungeonList[i].par_time_ms) {
      dungeons[i].children[2].innerHTML = `Time: ${msToTime(dungeonList[i].clear_time_ms)}`;
    } else {
      dungeons[i].children[2].innerHTML = `Time: ${msToTime(dungeonList[i].clear_time_ms)} (over time)`;
    }

    // score
    dungeons[i].children[3].innerHTML = `Score: ${dungeonList[i].score}`;
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
      return 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(img/mechagon.jpg)';
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
// function redirectToRaiderio(target) {
//   const regionList = document.querySelector('.regions');
//   const realm = document.querySelector('.realm-text');
//   const charName = document.querySelector('.char-text');
//   fetchCharacterData(regionList.value, realm.value, charName.value).then((data) => {
//     for (i = 0; i < data.mythic_plus_best_runs.length; i++) {
//       if (target === `${data.mythic_plus_best_runs[i].short_name}`) {
//         window.open(`${data.mythic_plus_best_runs[i].url}`, '_blank');
//         break;
//       }
//     }
//   });
// }

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
    let clone = original.cloneNode(true);
    if (affix === 'F') clone.className += ' keystone-dungeon-fortified';
    else clone.className += ' keystone-dungeon-tyrannical';
    clone.id = `${data.seasons[0].dungeons[i].short_name}-${affix}`;
    appendTo.appendChild(clone);
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
