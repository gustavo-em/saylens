//
//  SpeechRecognitionModule.m
//  SayLens
//
//  Registers the Swift speech recognition module with React Native.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (SayLensSpeechRecognition, NSObject)

RCT_EXTERN_METHOD(isAvailable
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasPermission
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(listen
                  : (NSString *)languageTag resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancel
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

@end
