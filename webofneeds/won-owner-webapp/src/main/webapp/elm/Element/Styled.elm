module Element.Styled exposing
    ( Attr
    , Attribute
    , Element
    , Style
    , above
    , below
    , column
    , el
    , element
    , fill
    , getAttrList
    , getElement
    , height
    , layout
    , modular
    , none
    , padding
    , pureAttr
    , px
    , row
    , spacing
    , styleDecoder
    , text
    , width
    , withStyle
    )

import Color exposing (Color)
import Element
import Html exposing (Html)
import Json.Decode as Decode exposing (Decoder)


type alias Style =
    { primary : Color
    , secondary : Color
    }


colorDecoder : Decoder Color
colorDecoder =
    Decode.map3 Color.rgb255
        (Decode.field "r" Decode.int)
        (Decode.field "g" Decode.int)
        (Decode.field "b" Decode.int)


styleDecoder : Decoder Style
styleDecoder =
    Decode.map2 Style
        (Decode.field "primaryColor" colorDecoder)
        (Decode.field "secondaryColor" colorDecoder)


type Element msg
    = Element (Style -> Element.Element msg)


type alias Attribute msg =
    Attr () msg


type Attr decorative msg
    = Attr (Style -> Element.Attr decorative msg)


type alias Length =
    Element.Length


fill : Length
fill =
    Element.fill


px : Int -> Length
px len =
    Element.px len


width : Length -> Attribute msg
width len =
    pureAttr <| Element.width len


height : Length -> Attribute msg
height len =
    pureAttr <| Element.height len


padding : Int -> Attribute msg
padding len =
    pureAttr <| Element.padding len


spacing : Int -> Attribute msg
spacing len =
    pureAttr <| Element.spacing len


text : String -> Element msg
text str =
    Element <|
        \_ -> Element.text str


applyAttr style (Attr fn) =
    fn style


applyEl style (Element fn) =
    fn style


modular : Float -> Float -> Int -> Float
modular =
    Element.modular


layout : Style -> List (Attribute msg) -> Element msg -> Html msg
layout style attrs elem =
    Element.layout
        (List.map
            (applyAttr style)
            attrs
        )
        (applyEl style elem)


withStyle : (Style -> Element msg) -> Element msg
withStyle elemFn =
    Element <|
        \style ->
            let
                (Element fn) =
                    elemFn style
            in
            fn style


row : List (Attribute msg) -> List (Element msg) -> Element msg
row attrs elements =
    Element <|
        \style ->
            Element.row
                (List.map (applyAttr style) attrs)
                (List.map (applyEl style) elements)


column : List (Attribute msg) -> List (Element msg) -> Element msg
column attrs elements =
    Element <|
        \style ->
            Element.column
                (List.map (applyAttr style) attrs)
                (List.map (applyEl style) elements)


above : Element msg -> Attribute msg
above elem =
    Attr
        (\style ->
            Element.above <|
                applyEl style elem
        )


below : Element msg -> Attribute msg
below elem =
    Attr
        (\style ->
            Element.below <|
                applyEl style elem
        )


el : List (Attribute msg) -> Element msg -> Element msg
el attrs elem =
    Element <|
        \style ->
            Element.el
                (List.map (applyAttr style) attrs)
                (applyEl style elem)


pureAttr : Element.Attr decorative msg -> Attr decorative msg
pureAttr attr =
    Attr (\_ -> attr)


element : (Style -> Element.Element msg) -> Element msg
element fn =
    Element fn


getElement :
    Element msg
    -> (Style -> Element.Element msg -> b)
    -> Style
    -> b
getElement elem fn style =
    fn style (applyEl style elem)


getAttrList :
    List (Attr decorative msg)
    -> (Style -> List (Element.Attr decorative msg) -> b)
    -> Style
    -> b
getAttrList attrs fn style =
    fn style (List.map (applyAttr style) attrs)


none : Element msg
none =
    Element (\_ -> Element.none)
