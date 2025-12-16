

/* 
 * 
 *          noa hello-world example
 * 
 *  This is a bare-minimum example world, intended to be a 
 *  starting point for hacking on noa game world content.
 * 
*/



// Engine options object, and engine instantiation.
import { Engine } from 'noa-engine'

function makeKey(x, y, z) {
  return (x << 19) | (z << 8) | y;
}

async function loadCSVToMap(url) {
  const response = await fetch(url);
  const text = await response.text();

  const map = new Map();
  const lines = text.trim().split('\n');
  lines.shift(); // remove header

  for (const line of lines) {
    const [x, y, z, id] = line.split(',').map(Number);

    if (id !== 0) {
      map.set(makeKey(x, y, z), id);
    }
  }

  return map;
}

const csvVoxelMap = await loadCSVToMap('data.csv');
const levelData = await loadCSVToMap('leveldata.csv');
var playerData = new Map();
console.log(csvVoxelMap);

async function loadImagePixels(url) {
    // 1. Create Image and Canvas elements
    const image = new Image();
    image.crossOrigin = "anonymous"; // Needed for cross-origin images to prevent CORS errors
    image.src = url;

    // Wait for the image to load
    await image.decode();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;

    // 2. Draw the image onto the canvas
    context.drawImage(image, 0, 0);

    // 3. Get the raw pixel data (a 1D Uint8ClampedArray)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data; // This is a 1D array of [r, g, b, a, r, g, b, a, ...]

    // 4. Convert the 1D array into a 2D array of RGB objects
    const pixelArray2D = [];
    for (let y = 0; y < canvas.height; y++) {
        const row = [];
        for (let x = 0; x < canvas.width; x++) {
            const startIndex = (y * canvas.width + x) * 4; // Each pixel has 4 values (RGBA)
            const r = pixels[startIndex];
            const g = pixels[startIndex + 1];
            const b = pixels[startIndex + 2];
            // Alpha (transparency) is pixels[startIndex + 3], but we only want RGB

            row.push({ r, g, b });
        }
        pixelArray2D.push(row);
    }

    return pixelArray2D;
}

const imagePixels = await loadImagePixels("imgMap.png");
const imgWidth = imagePixels[0].length;
const imgHeight = imagePixels.length;

var noa = new Engine({
    debug: true,
    showFPS: true,
    chunkSize: 48,
    chunkAddDistance: [8.5, 6],
    playerStart: [0, 10, 0],
    playerAutoStep: true,
    playerShadowComponent: false,
    originRebaseDistance: 10,
})

var newPosition = [1167, 140, 497]

// Move player instantly
noa.entities.setPosition(noa.playerEntity, newPosition)



/*
 *
 *      Registering voxel types
 * 
 *  Two step process. First you register a material, specifying the 
 *  color/texture/etc. of a given block face, then you register a 
 *  block, which specifies the materials for a given block type.
 * 
*/

// generate 20 distinct colors
var colors = []
for (let i = 0; i < 20; i++) {
    let r = i*20;
    let g = 0;
    let b = 0;
    if(r > 255) {
      g = i*20-255;
      if(g > 255) {
        b = i*20-255;
      }
    }
    if(r == 0) {
      colors.push([1,1,1]);
    } else {
      colors.push([r/255,g/255,b/255]);
    }
}

// register materials and blocks
var blockIDs = []

colors.forEach((color, i) => {
    let materialName = `color_${i}`
    noa.registry.registerMaterial(materialName, { color })

    let blockID = noa.registry.registerBlock(i + 1, {
        material: materialName
    })

    blockIDs.push(blockID)
})




/*
 * 
 *      World generation
 * 
 *  The world is divided into chunks, and `noa` will emit an 
 *  `worldDataNeeded` event for each chunk of data it needs.
 *  The game client should catch this, and call 
 *  `noa.world.setChunkData` whenever the world data is ready.
 *  (The latter can be done asynchronously.)
 * 
*/


// simple height map worldgen function
function getVoxelID(x, y, z) {
  if (y < -3) return 0;

  // bounds check for image
  if (x < 0 || z < 0 || z >= imgHeight || x >= imgWidth) {
    return 0;
  }

  // CSV override
  const csvIdleveldata = levelData.get(makeKey(x, y, z));
  if (csvIdleveldata !== undefined) {
    return csvIdleveldata+1;
  }

  // CSV override
  const csvId = csvVoxelMap.get(makeKey(x, y, z));
  if (csvId !== undefined) {
    return csvId+1;
  }

  // heightmap terrain
  const pixel = imagePixels[z][x];
  const height = pixel.r;

  if (y < height) return 1;
  return 0;
}

var currentSelectedID = 1;

// register for world events
noa.world.on('worldDataNeeded', function (id, chunk, x, y, z) {
    for (let i = 0; i < chunk.shape[0]; i++) {
        for (let j = 0; j < chunk.shape[1]; j++) {
            for (let k = 0; k < chunk.shape[2]; k++) {
                const voxelID = getVoxelID(x + i, y + j, z + k);
                chunk.set(i, j, k, voxelID);
            }
        }
    }

    noa.world.setChunkData(id, chunk);
});



/*
 * 
 *      Minimal interactivity 
 * 
*/

function worldToChunk(x, y, z) {
    var cs = noa.world._chunkSize
    return [
        Math.floor(x / cs),
        Math.floor(y / cs),
        Math.floor(z / cs),
    ]
}

noa.inputs.down.on('fire', function () {
    if (noa.targetedBlock) {
        var pos = noa.targetedBlock.position

        // world → chunk coordinates
        var chunk = worldToChunk(pos[0], pos[1], pos[2])

        console.log(
            `Clicked voxel at world (${pos[0]}, ${pos[1]}, ${pos[2]}) ` +
            `→ chunk (${chunk[0]}, ${chunk[1]}, ${chunk[2]})`
        )

        noa.setBlock(0, pos[0], pos[1], pos[2])
        playerData.set([pos[0], pos[1], pos[2]], 0);
    }
})

function downloadMapAsCSV(map, filename = "data.csv") {
  // CSV header
  let csvContent = "x,y,z,id\n";

  for (const [[x, y, z], id] of map.entries()) {
    csvContent += `${x},${y},${z},${id}\n`;
  }

  // Create a Blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// place some grass on right click
noa.inputs.down.on('alt-fire', function () {
    if (noa.targetedBlock) {
        var pos = noa.targetedBlock.adjacent
        noa.setBlock(currentSelectedID, pos[0], pos[1], pos[2])
        playerData.set([pos[0], pos[1], pos[2]], currentSelectedID);
    }
})

// add a key binding for "E" to do the same as alt-fire
noa.inputs.bind('alt-fire', 'KeyE')


// each tick, consume any scroll events and use them to zoom camera
noa.on('tick', function (dt) {
    var scroll = noa.inputs.pointerState.scrolly
    if (scroll !== 0) {
        if( scroll < 0) {
          currentSelectedID--;
          if(currentSelectedID < 1) {
            currentSelectedID = 1
          }
        }

        if( scroll > 0) {
          currentSelectedID++;
          if(currentSelectedID > 20) {
            currentSelectedID = 20
          }
        }
        console.log(currentSelectedID);
    }
})

function setupCSVDownloadShortcut(map, filename = "leveldata.csv") {
  document.addEventListener("keydown", (event) => {
    // Ctrl + D
    if (event.key.toLowerCase() === "b") {
      event.preventDefault(); // prevent browser bookmark shortcut
      downloadMapAsCSV(playerData, filename);
    }
  });
};

setupCSVDownloadShortcut(playerData);