/* Ms. Asmaa guide - image slots. Swap files in assets/asmaa/ with the 3D
   versions (same filenames) and every screen updates with no code change. */
(function(){
window.Asmaa = {
  dir: 'assets/asmaa/',
  names: ['wave','point','cheer','think','book','bust'],
  get(name, cls){
    return '<img class="asmaa '+(cls||'')+'" src="'+this.dir+name+'.png" alt="مس أسماء">';
  }
};
})();
