$target = "example-tailwind"
$command = "build"
$projRoot = "D:\CodeProjects"

Set-Location $projRoot\rollup-plugin-tsickle
pnpm run prepublishOnly

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $projRoot\$target\node_modules\@pathscale\rollup-plugin-tsickle\dist
Move-Item $projRoot\rollup-plugin-tsickle\dist $projRoot\$target\node_modules\@pathscale\rollup-plugin-tsickle\dist

Set-Location $projRoot\$target\
pnpm run $command
