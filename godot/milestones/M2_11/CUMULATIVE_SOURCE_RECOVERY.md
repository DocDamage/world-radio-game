# TerraWave M2.11 cumulative source recovery

The previously uploaded `TerraWave_Godot_4.7.2_M2_10R_Coastal_Source` archive was truncated and could not be trusted as the cumulative source baseline. The saved `TerraWave_Godot_4.7.2_M2_9_Harbor_Sailing_DEV_Source` archive was later supplied and verified healthy.

## Reconstruction performed

1. Verified the saved M2.9 source ZIP: 1,949 ZIP entries; ZIP integrity check passed.
2. Extracted the pristine `TerraWave-Godot-M2.9` source tree.
3. Applied the official `TerraWave_M2_10R_Update_From_M2_9` helper, which verifies the pristine M2.9 base and update payload before publishing.
4. The updater published a complete M2.10R source tree with 2,305 files, including `SOURCE_MANIFEST.json`.
5. Applied the verified M2.11 harbor-navigation patch to that complete source tree.
6. Opened/scanned the reconstructed project with Godot `4.7.2.stable.official.ed1daf0bf` so global classes and imports could register.
7. Ran `tests/test_navigation_guide.gd` against the reconstructed project: 11/11 checks passed with no missing-source/autoload errors after the class scan.

## Reconstructed state

- Development version: `0.2.11-dev`
- Source tree before generated `.godot` cache: approximately 602 MB / 2,325 files after M2.11 and local validation artifacts were present.
- `project.godot` SHA-256: `d3b5b352989dbbfc8d7dafce386fcfd396792744198ceec2e6eaebbb64df6cfc`
- `BUILD_INFO.json` SHA-256: `597b8ac2f3597809671e5a357f392647e353d2306ce6b594369f76669e535ba6`
- inherited M2.10R `SOURCE_MANIFEST.json` SHA-256: `f16e52625243911326973270cde7473071b778d09d3b9eff8bc64d1387dd1c74`
- M2.11 handoff SHA-256: `cf729117a8d5dac4b1bc6ebfc6b462c5636a1c396c766f195e6891dfd6262acb`

## Repository policy

The cumulative source contains hundreds of megabytes of binary GLB/PNG/RES/FBX/JPG assets. Those should not be committed as ordinary Git history without a deliberate Git LFS/release-artifact policy. This branch therefore keeps the editable M2.11 patch/source changes and recovery provenance in Git, while the large saved cumulative archives remain the binary source-of-record for reconstruction.

The next repository step should be to establish either Git LFS for owned binary assets or a GitHub Release/external artifact store, then import the full reconstructed native tree without duplicating hundreds of megabytes into normal commit history.
