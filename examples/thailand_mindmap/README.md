# Thailand mindmap example

This example builds a small idea graph about food, travel, and culture in Thailand.

## Run the scripted example

```bash
node ./examples/thailand_mindmap/thailand_mindmap.js
```

## Import CSV into example JSON file

From repository root:

```bash
ROSEMARY_DATA_FILE=./examples/thailand_mindmap/thailand_mindmap.json \
node -e "const R=require('./src/Rosemary');const p=require('path');const b=new R({dataFile:process.env.ROSEMARY_DATA_FILE});b.importFromCSV(p.join(process.cwd(),'examples/thailand_mindmap/thailand_mindmap.csv')).then(()=>{b.saveData();console.log('import complete');});"
```

