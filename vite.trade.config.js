import {defineConfig} from 'vite';
export default defineConfig({
  build:{lib:{entry:'js/trade-offer-worker-source.js',formats:['iife'],name:'DFLTradeOffers',fileName:()=>'trade-offers.js'},outDir:'js/workers',emptyOutDir:false,sourcemap:true,minify:'oxc'}
});
