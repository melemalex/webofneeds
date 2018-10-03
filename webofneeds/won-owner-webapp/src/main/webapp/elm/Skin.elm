module Skin exposing (Skin, cssColor)

import Element exposing (..)


type alias Skin =
    { primaryColor : Color
    , lightGray : Color
    , lineGray : Color
    , subtitleGray : Color
    , black : Color
    , white : Color
    }


cssColor : Color -> String
cssColor color =
    let
        { red, green, blue, alpha } =
            toRgb color

        to255 col =
            String.fromInt <| round (col * 255)

        colors =
            ([ red
             , green
             , blue
             ]
                |> List.map to255
            )
                ++ [ String.fromFloat alpha ]
    in
    "rgba("
        ++ String.join "," colors
        ++ ")"


setAlpha : Float -> Color -> Color
setAlpha alpha color =
    let
        oldRgb =
            toRgb color
    in
    fromRgb
        { oldRgb
            | alpha = alpha
        }
