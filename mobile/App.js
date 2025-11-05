import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Linking, Platform, SafeAreaView, StatusBar, View, TouchableOpacity, Text } from 'react-native'
import Constants from 'expo-constants'
import { WebView } from 'react-native-webview'

function getBaseUrl() {
  const fromExtra =
    process.env.EXPO_PUBLIC_BASE_URL ||
    (Constants?.expoConfig?.extra?.baseUrl || Constants?.manifest2?.extra?.baseUrl)
  if (fromExtra && typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim()
  // Sensible defaults for local dev
  if (Platform.OS === 'android') return 'http://10.0.2.2:5173'
  //return 'http://192.168.1.7:5173/'
  return 'https://microfin-blond.vercel.app/'
}

export default function App() {
  const webRef = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [activeTab, setActiveTab] = useState('lines')
  const [loaded, setLoaded] = useState(false)

  const BASE_URL = useMemo(getBaseUrl, [])
  const baseHost = useMemo(() => {
    try { return new URL(BASE_URL).host } catch { return '' }
  }, [BASE_URL])

  useEffect(() => {
    const onBack = () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack()
        return true
      }
      return false
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
    return () => sub.remove()
  }, [canGoBack])

  function handleExternal(url) {
    const lower = (url || '').toLowerCase()
    if (lower.startsWith('tel:') || lower.startsWith('mailto:') || lower.startsWith('geo:')) {
      Linking.openURL(url).catch(() => {})
      return true
    }
    // Open http(s) links outside if not same host as BASE_URL
    try {
      const u = new URL(url)
      if (u.host && baseHost && u.host !== baseHost) {
        Linking.openURL(url).catch(() => {})
        return true
      }
    } catch {}
    return false
  }

  function pathFromUrl(url) {
    try { return new URL(url).pathname } catch { return '/' }
  }

  function navigateWebPath(path, tabKey) {
    setActiveTab(tabKey)
    const js = `window.location.href='${path}'; true;`
    try { webRef.current && webRef.current.injectJavaScript(js) } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <View style={{ flex: 1 }}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ uri: BASE_URL }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(!!navState.canGoBack)
            setCurrentUrl(navState.url)
            setLoaded(true)
            const p = pathFromUrl(navState.url)
            // Redirect home/dashboard to Lines on mobile
            if (p === '/' || p === '/dashboard') {
              navigateWebPath('/lines', 'lines')
              return
            }
            if (p.startsWith('/lines')) setActiveTab('lines')
            else if (p.startsWith('/customers')) setActiveTab('customers')
            else if (p.startsWith('/settings')) setActiveTab('settings')
          }}
          onShouldStartLoadWithRequest={(request) => {
            // Intercept external handlers
            if (handleExternal(request.url)) return false
            return true
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mixedContentMode="always"
          startInLoadingState
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          // helpful when app is behind login redirects
          onError={() => {}}
          onHttpError={() => {}}
        />
        {(() => {
          const path = pathFromUrl(currentUrl)
          const isAuth = path.startsWith('/login') || path.startsWith('/create-company') || path.startsWith('/create-admin')
          const showTabs = loaded && !isAuth
          if (!showTabs) return null
          return (
            <View style={{ height: 56, borderTopWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', backgroundColor: '#ffffff' }}>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => navigateWebPath('/lines', 'lines')}>
                <Text style={{ color: activeTab === 'lines' ? '#2563eb' : '#374151', fontWeight: activeTab === 'lines' ? '700' : '500' }}>Line</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => navigateWebPath('/customers', 'customers')}>
                <Text style={{ color: activeTab === 'customers' ? '#2563eb' : '#374151', fontWeight: activeTab === 'customers' ? '700' : '500' }}>Customers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => navigateWebPath('/settings', 'settings')}>
                <Text style={{ color: activeTab === 'settings' ? '#2563eb' : '#374151', fontWeight: activeTab === 'settings' ? '700' : '500' }}>Settings</Text>
              </TouchableOpacity>
            </View>
          )
        })()}
      </View>
    </SafeAreaView>
  )
}


