/* Mahluk Hidup 1 restored. Read-only compatibility shim for older integrations.
 * Never remove browser storage, custom characters or published asset history.
 */
(function(root){"use strict";
 const api=Object.freeze({mode:"mahluk-hidup-v1",active:false,
  message:"MAHLUK HIDUP 1 / ORIGINAL V6B",
  approvedIds:Object.freeze([]),visible:()=>true,
  filter:characters=>Array.isArray(characters)?characters:[],
  get hasApproved(){return true}});
 root.VLCharacterReferenceReset=api;
 root.document?.documentElement?.classList.remove("character-reference-reset");
})(typeof window!=="undefined"?window:{});