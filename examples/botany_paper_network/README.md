Try:

```bash
# Generate JSON dataset from the script
node botany_paper_network.js > botany_network.json

# Import CSV directly into a data file
ROSEMARY_DATA_FILE=./examples/botany_paper_network/botany_paper_network.json node -e "const R=require('rosemary-js');const p=require('path');const b=new R({dataFile:process.env.ROSEMARY_DATA_FILE});b.importFromCSV(p.join(process.cwd(),'examples/botany_paper_network/botany_paper_network.csv')).then(()=>console.log('done'))"
```
