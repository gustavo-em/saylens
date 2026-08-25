//
//  PronunciationModule.m
//  SayLens
//
//  Registers the Swift pronunciation module with React Native.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (SayLensPronunciation, NSObject)

RCT_EXTERN_METHOD(speak
                  : (NSString *)text languageTag
                  : (NSString *)languageTag rate
                  : (nonnull NSNumber *)rate resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

@end
