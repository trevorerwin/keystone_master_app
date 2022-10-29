/**
 * Variabless
 */

const keystoneCodeBlock =
  '<h3 class="keystone-dungeon-name"></h3>' + '<h3 class="keystone-dungeon-affixes"></h3>' + '<h3 class="keystone-dungeon-time"></h3>' + '<h3 class="keystone-dungeon-score"></h3>';

const dataDisplay = document.querySelector('.data-display');
const regionList = document.querySelector('.regions');
const realm = document.querySelector('.realm-text');
const charName = document.querySelector('.char-text');
const submitBtn = document.querySelector('.submit-btn');
const keystoneDungeonList = document.querySelector('.keystone-best-runs');
const keystoneInfoSection = document.querySelector('.keystone-info');
// const keystoneDungeon = document.querySelector('.keystone-dungeon');

/**
 * Event Listeners
 */
submitBtn.addEventListener('click', () => {
  if (realm.value == '' || charName.value == '') {
    displayErrorMessage('You must fill in all required fields before submitting');
  } else {
    fetchWowData(regionList.value, realm.value, charName.value).then((data) => {
      if (data.statusCode === 400) {
        displayErrorMessage(data.message);
      } else {
        console.log(data);
        displayIntro(data);
        deleteDungeonData();
        processDungeonData(data);
      }
    });
  }
});

/**
 * fetchWowData(): Fetches the Promise and resolves to the Response object, *                 and converts it to JSON in order to read the data provided *                 by Raider.io
 *
 * @param {String} region: the selected region
 * @param {String} realm: realm string
 * @param {String} char: character name string
 *
 * @returns A JSON object containing information pertaining to inputted       character
 */
async function fetchWowData(region, realm, char) {
  const response = await fetch(
    `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${char}&fields=mythic_plus_ranks,mythic_plus_scores_by_season:current,mythic_plus_best_runs`
  );

  const json = await response.json();
  return json;
}

/**
 * displayIntro(): Sets the HTML of dataDisplay to show the character *                 thumbnail, name, mythic plus score, and whether they are *                 currently keystone master or not
 *
 * @param {Object} data: JSON object fetched from Raider.io
 */
function displayIntro(data) {
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
 * processDungeonData(): Set the HTML of the keystone-best-runs div to show *                       the inputted character's best 8 runs
 *
 * @param {Object} data: JSON object fetched from API
 */
function processDungeonData(data) {
  // create a keystone-dungeon div
  const keystoneDungeon = addDungeonDiv();

  // append dungeon divs based on number of dungeons in current season
  keystoneInfoSection.style.display = 'block';
  appendNCopies(data.mythic_plus_best_runs.length, keystoneDungeon, keystoneDungeonList);

  // get all keystone-dungeon elements
  const dungeons = document.getElementsByClassName('keystone-dungeon');
  const bestDungeonRuns = data.mythic_plus_best_runs;

  insertDungeonData(dungeons, bestDungeonRuns);
}

function insertDungeonData(dungeons, dungeonList) {
  // insert the dungeon data into the html
  for (let i = 0; i < dungeonList.length; i++) {
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

function addDungeonDiv() {
  // create the div
  const keystoneDungeon = document.createElement('div');
  keystoneDungeon.className = 'keystone-dungeon';
  keystoneDungeon.innerHTML = keystoneCodeBlock;
  return keystoneDungeon;
}

/**
 * deleteDungeonData(): deletes the current dungeon data from the UI if any *                      exist
 *
 */
function deleteDungeonData() {
  dungeons = document.getElementsByClassName('keystone-dungeon');

  for (const dungeon of dungeons) {
    dungeon.remove();
  }
}

/**
 * keystoneUpgrade(): determine upgrade level of keystone with '+' symbols
 *
 * @param {Integer} num: keystone upgrade level
 *
 * @return upgrade level as a string of '+' symbols
 */
function keystoneUpgrade(num) {
  const keyUpgrade = ['', '+', '++', '+++'];
  return keyUpgrade[num];
}

/**
 * appendNCopies(): helper function to append nodes to the document - used    *                  for inserting dungeon data
 *
 * @param {Integer} n: number of clones we want
 * @param {Object} original: the node we want to copy
 * @param {Object} appendTo: the node we want to append to
 */
function appendNCopies(n, original, appendTo) {
  for (let i = 0; i < n; i++) {
    let clone = original.cloneNode(true);
    appendTo.appendChild(clone);
  }
}

/**
 * displayErrorMessage(): Displays an error modal in the window
 *
 * @param {String} msg: Error message to display
 */
function displayErrorMessage(msg) {
  console.log(msg);
}

/**
 * isKeystoneMaster(): Checks if inputted character has KSM already
 *
 * @param {Integer} playerRating
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
 * @returns the time in the specified format above
 */
function msToTime(s) {
  // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad((s / 3.6e6) | 0) + ':' + pad(((s % 3.6e6) / 6e4) | 0) + ':' + pad(((s % 6e4) / 1000) | 0) + '.' + pad(s % 1000, 3);
}
