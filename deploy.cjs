const {execFileSync}=require('node:child_process');
function git(args,options={}){return execFileSync('git',args,{cwd:__dirname,encoding:'utf8',windowsHide:true,...options})}
try{
  if(git(['status','--porcelain']).trim())throw new Error('Commit source changes before deploying.');
  const sha=git(['subtree','split','--prefix=dist','HEAD']).trim();
  git(['push','origin',sha+':refs/heads/gh-pages'],{stdio:'inherit'});
  console.log('Published source to gh-pages. Check the Pages build in GitHub Actions.');
}catch(error){console.error(error.message);process.exitCode=1}
