# Botany paper network example

This example demonstrates importing a paper/tag dataset and generating a network representation.

## From repository root

```bash
# import CSV into the example JSON data file
ROSEMARY_DATA_FILE=./examples/botany_paper_network/botany_paper_network.json \
node -e "const R=require('./src/Rosemary');const p=require('path');const b=new R({dataFile:process.env.ROSEMARY_DATA_FILE});b.importFromCSV(p.join(process.cwd(),'examples/botany_paper_network/botany_paper_network.csv')).then(()=>{b.saveData();console.log('import complete');});"
```

## Generate programmatic dataset output

```bash
node ./examples/botany_paper_network/botany_paper_network.js
```

