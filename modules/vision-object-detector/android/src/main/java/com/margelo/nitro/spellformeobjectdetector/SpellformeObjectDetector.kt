package com.margelo.nitro.spellformeobjectdetector
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class SpellformeObjectDetector : HybridSpellformeObjectDetectorSpec() {
  override fun getModelName(): String {
    return "EfficientDet-Lite0 int8"
  }
}
